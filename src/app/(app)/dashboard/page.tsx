import Link from "next/link";
import {
  ClipboardList,
  CreditCard,
  FileText,
  ReceiptText,
  TrendingDown,
  TrendingUp,
  Truck,
  Building2,
} from "lucide-react";

import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getOrgContext } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { APP_CURRENCY } from "@/lib/config";

export const metadata = { title: "Tableau de bord" };

function money(value: number) {
  return new Intl.NumberFormat("fr-MA", {
    style: "currency",
    currency: APP_CURRENCY,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function DashboardPage() {
  const { orgId } = await getOrgContext();

  const [
    productsCount,
    suppliersCount,
    openRfqCount,
    poAggregate,
    rfqs,
    supplierSpendRaw,
    recentPOs,
    allInvoices,
    paymentsThisMonth,
  ] = await Promise.all([
    prisma.product.count({ where: { orgId } }),
    prisma.supplier.count({ where: { orgId } }),
    prisma.rfq.count({ where: { orgId, status: "SENT" } }),
    prisma.purchaseOrder.aggregate({
      where: { orgId, status: { not: "CANCELLED" } },
      _sum: { total: true },
      _count: true,
    }),
    prisma.rfq.findMany({
      where: { orgId, status: "CLOSED" },
      include: {
        items: true,
        recipients: {
          include: {
            quote: {
              include: { items: true }
            }
          }
        }
      },
    }),
    prisma.purchaseOrder.groupBy({
      by: ["supplierId"],
      where: { orgId, status: { not: "CANCELLED" } },
      _sum: { total: true },
      orderBy: { _sum: { total: "desc" } },
      take: 5,
    }),
    prisma.purchaseOrder.findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { supplier: { select: { name: true } } },
    }),
    prisma.invoice.findMany({
      where: { po: { orgId } },
      include: { payments: { select: { amount: true } } },
    }),
    prisma.payment.aggregate({
      where: {
        invoice: { po: { orgId } },
        date: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
      },
      _sum: { amount: true },
      _count: true,
    }),
  ]);

  const totalSpend = poAggregate._sum.total || 0;
  const poCount = poAggregate._count || 0;

  // Compute unpaid invoices
  let unpaidInvoiceCount = 0;
  let unpaidInvoiceAmount = 0;
  for (const inv of allInvoices) {
    const paid = inv.payments.reduce((s: number, p: { amount: number }) => s + p.amount, 0);
    const remaining = inv.amountTTC - paid;
    if (remaining > 0.01) {
      unpaidInvoiceCount++;
      unpaidInvoiceAmount += remaining;
    }
  }

  const monthlyPayments = paymentsThisMonth._sum.amount || 0;
  const monthlyPaymentCount = paymentsThisMonth._count || 0;

  let totalSavings = 0;
  for (const rfq of rfqs) {
    const validQuotes = rfq.recipients
      .map((r) => r.quote)
      .filter((q) => q !== null && q.status !== "RECEIVED"); // RECEIVED is pending, SUBMITTED or ACCEPTED are actual. Actually status is RECEIVED | SELECTED | REJECTED.
    
    // validQuotes are those with status SELECTED or REJECTED.
    if (validQuotes.length > 1) {
      const quoteTotals = validQuotes.map(q => {
        const itemsTotal = q!.items.reduce((sum, qItem) => {
          const rfqItem = rfq.items.find(ri => ri.productId === qItem.productId);
          return sum + (rfqItem?.quantity || 0) * qItem.unitPrice;
        }, 0);
        return itemsTotal + (q!.shippingCost || 0);
      });
      
      const maxTotal = Math.max(...quoteTotals);
      const acceptedQuote = validQuotes.find((q) => q!.status === "SELECTED");
      if (acceptedQuote) {
        const acceptedItemsTotal = acceptedQuote.items.reduce((sum, qItem) => {
          const rfqItem = rfq.items.find(ri => ri.productId === qItem.productId);
          return sum + (rfqItem?.quantity || 0) * qItem.unitPrice;
        }, 0);
        const acceptedTotal = acceptedItemsTotal + (acceptedQuote.shippingCost || 0);
        
        if (maxTotal > acceptedTotal) {
          totalSavings += maxTotal - acceptedTotal;
        }
      }
    }
  }

  const supplierIds = supplierSpendRaw.map((s) => s.supplierId);
  const suppliersInfo = await prisma.supplier.findMany({
    where: { id: { in: supplierIds } },
    select: { id: true, name: true },
  });

  const maxSupplierSpend =
    supplierSpendRaw.length > 0 ? supplierSpendRaw[0]._sum.total || 1 : 1;

  const topSuppliers = supplierSpendRaw.map((s) => ({
    name: suppliersInfo.find((sup) => sup.id === s.supplierId)?.name || "Inconnu",
    total: s._sum.total || 0,
    percentage: Math.round(((s._sum.total || 0) / maxSupplierSpend) * 100),
  }));

  const mainStats = [
    {
      label: "Dépenses totales",
      value: money(totalSpend),
      description: `${poCount} bons de commande`,
      icon: TrendingUp,
      color: "text-red-600",
    },
    {
      label: "Économies réalisées",
      value: money(totalSavings),
      description: "Différence avec le devis le plus cher",
      icon: TrendingDown,
      color: "text-emerald-600",
    },
    {
      label: "Demandes en cours",
      value: openRfqCount,
      description: "Appels d'offres ouverts",
      icon: FileText,
      color: "text-blue-600",
    },
    {
      label: "Fournisseurs",
      value: suppliersCount,
      description: `${productsCount} produits référencés`,
      icon: Building2,
      color: "text-muted-foreground",
    },
  ];

  return (
    <>
      <PageHeader
        title="Tableau de bord"
        description="Vue d'ensemble de vos dépenses, économies et activités récentes."
      />

      {/* KPIs principaux */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {mainStats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <CardAction>
                <stat.icon className={`size-4 ${stat.color}`} />
              </CardAction>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold tracking-tight">
                {stat.value}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Alertes Comptables */}
      {(unpaidInvoiceCount > 0 || monthlyPaymentCount > 0) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {unpaidInvoiceCount > 0 && (
            <Link href="/invoices" className="block">
              <div className="rounded-xl border-2 border-red-200 bg-red-50 p-5 hover:bg-red-100 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <ReceiptText className="size-5 text-red-600" />
                  <div>
                    <p className="font-bold text-red-800">{unpaidInvoiceCount} facture(s) en attente de paiement</p>
                    <p className="text-sm text-red-600 font-semibold tabular-nums">{money(unpaidInvoiceAmount)} à régler</p>
                  </div>
                </div>
              </div>
            </Link>
          )}
          <Link href="/payments" className="block">
            <div className="rounded-xl border border-border bg-white p-5 hover:bg-slate-50 transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <CreditCard className="size-5 text-emerald-600" />
                <div>
                  <p className="font-bold">Paiements ce mois-ci</p>
                  <p className="text-sm text-muted-foreground tabular-nums">{money(monthlyPayments)} — {monthlyPaymentCount} paiement(s)</p>
                </div>
              </div>
            </div>
          </Link>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {/* Dépenses par fournisseur */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="size-4" />
              Top fournisseurs
            </CardTitle>
            <CardDescription>Vos principaux fournisseurs en volume d&apos;achats.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 space-y-4">
            {topSuppliers.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Aucun bon de commande validé.
              </div>
            ) : (
              topSuppliers.map((supplier) => (
                <div key={supplier.name} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium truncate pr-4">{supplier.name}</span>
                    <span className="font-semibold">{money(supplier.total)}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${supplier.percentage}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Dernières commandes */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="size-4" />
              Dernières commandes
            </CardTitle>
            <CardDescription>Activité d&apos;achat la plus récente.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            {recentPOs.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Aucune commande récente.
              </div>
            ) : (
              <div className="space-y-4">
                {recentPOs.map((po) => (
                  <div key={po.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 items-center justify-center rounded-lg border bg-card">
                        <FileText className="size-4 text-muted-foreground" />
                      </div>
                      <div>
                        <Link 
                          href={`/purchase-orders/${po.id}`}
                          className="font-medium text-sm hover:underline"
                        >
                          {po.supplier.name}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {po.reference} · {new Date(po.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-sm font-semibold">
                        {money(po.total)}
                      </span>
                      {po.status === "DRAFT" && <Badge variant="secondary" className="text-[10px]">Brouillon</Badge>}
                      {po.status === "SENT" && <Badge variant="outline" className="text-[10px] text-blue-600 border-blue-600">Envoyée</Badge>}
                      {po.status === "CONFIRMED" && <Badge variant="default" className="text-[10px] bg-emerald-600 hover:bg-emerald-600">Confirmée</Badge>}
                      {po.status === "RECEIVED" && <Badge variant="secondary" className="text-[10px]">Reçue</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
