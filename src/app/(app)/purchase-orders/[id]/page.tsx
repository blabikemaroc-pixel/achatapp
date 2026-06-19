import { ArrowLeft, FileDown, Package, ReceiptText } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { PoActions } from "@/components/po/po-actions";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { getOrgContext } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";

export const metadata = { title: "Bon de commande" };

const poStatus = {
  DRAFT: { label: "Brouillon", variant: "outline" as const },
  SENT: { label: "Envoyé", variant: "default" as const },
  CONFIRMED: { label: "Confirmé", variant: "secondary" as const },
  PARTIALLY_RECEIVED: { label: "Partiellement Reçu", variant: "secondary" as const },
  RECEIVED: { label: "Réceptionné", variant: "default" as const },
  INVOICED: { label: "Facturé", variant: "default" as const },
  CANCELLED: { label: "Annulé", variant: "destructive" as const },
};

export default async function PoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { orgId } = await getOrgContext();

  const po = await prisma.purchaseOrder.findFirst({
    where: { id, orgId },
    include: {
      supplier: true,
      items: {
        include: { product: { select: { name: true, unit: true } } },
      },
      receipts: {
        include: { items: true },
        orderBy: { date: "asc" }
      },
      invoices: {
        include: { items: true, payments: true },
        orderBy: { date: "asc" }
      }
    },
  });
  if (!po) notFound();

  const status = poStatus[po.status];
  
  const receivedByProduct = new Map<string, number>();
  for (const r of po.receipts) {
    for (const ri of r.items) {
      receivedByProduct.set(ri.productId, (receivedByProduct.get(ri.productId) ?? 0) + ri.quantity);
    }
  }

  const invoicedByProduct = new Map<string, number>();
  for (const inv of po.invoices) {
    for (const ii of inv.items) {
      invoicedByProduct.set(ii.productId, (invoicedByProduct.get(ii.productId) ?? 0) + ii.quantity);
    }
  }

  const lineSum = po.items.reduce(
    (s, i) => s + i.unitPrice * i.quantity,
    0,
  );
  const shipping = po.total - lineSum;

  return (
    <div className="space-y-6">
      <Link
        href="/purchase-orders"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Retour aux bons de commande
      </Link>

      <PageHeader
        title={`Commande ${po.reference}`}
        description={po.supplier.name}
        action={
          <Link
            href={`/purchase-orders/${po.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ variant: "outline" })}
          >
            <FileDown className="size-4" />
            Voir le PDF
          </Link>
        }
      />

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground bg-white p-4 rounded-xl border border-border shadow-sm">
        <span className="inline-flex items-center gap-2">
          Statut : <Badge variant={status.variant} className="text-xs">{status.label}</Badge>
        </span>
        <span>
          Créé le : <span className="text-foreground font-medium">{formatDate(po.createdAt)}</span>
        </span>
        {po.sentAt && (
          <span>
            Envoyé le : <span className="text-foreground font-medium">{formatDate(po.sentAt)}</span>
          </span>
        )}
        {po.confirmationFile && (
          <a
            href={po.confirmationFile}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-blue-600 hover:underline font-medium"
          >
            Voir la confirmation
          </a>
        )}
      </div>

      <PoActions
        poId={po.id}
        status={po.status}
        receiptCount={po.receipts.length}
        invoiceCount={po.invoices.length}
        unpaidInvoiceCount={po.invoices.filter(inv => {
          const totalPaid = inv.payments.reduce((s: number, p: { amount: number }) => s + p.amount, 0);
          return inv.amountTTC - totalPaid > 0.01;
        }).length}
      />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">Fournisseur</h2>
        <div className="rounded-xl border border-border p-5 text-sm bg-white shadow-sm flex flex-col md:flex-row gap-8">
          <div>
            <p className="font-semibold text-base mb-1">{po.supplier.name}</p>
            {po.supplier.contactName && <p className="text-muted-foreground">{po.supplier.contactName}</p>}
          </div>
          <div className="text-muted-foreground">
            <p>{po.supplier.email}</p>
            {po.supplier.address && <p>{po.supplier.address}</p>}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">Articles commandés</h2>
        <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Produit</TableHead>
                <TableHead className="text-right">Cmd (Qté)</TableHead>
                <TableHead className="text-right text-blue-600">Reçu</TableHead>
                <TableHead className="text-right text-purple-600">Facturé</TableHead>
                <TableHead className="text-right">P.U.</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {po.items.map((item) => {
                const rec = receivedByProduct.get(item.productId) ?? 0;
                const inv = invoicedByProduct.get(item.productId) ?? 0;
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.product.name}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatNumber(item.quantity)} {item.product.unit}</TableCell>
                    <TableCell className="text-right tabular-nums text-blue-600 font-medium">{formatNumber(rec)} {item.product.unit}</TableCell>
                    <TableCell className="text-right tabular-nums text-purple-600 font-medium">{formatNumber(inv)} {item.product.unit}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(item.unitPrice)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(item.unitPrice * item.quantity)}</TableCell>
                  </TableRow>
                );
              })}
              {shipping > 0.001 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-right text-muted-foreground">Frais de port</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(shipping)}</TableCell>
                </TableRow>
              )}
              <TableRow className="border-t-2 border-border bg-slate-50/50">
                <TableCell colSpan={5} className="text-right font-semibold">Total Général</TableCell>
                <TableCell className="text-right text-lg font-bold text-primary tabular-nums">{formatCurrency(po.total)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </section>

      {po.notes && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">Note</h2>
          <p className="text-sm bg-yellow-50 p-4 rounded-xl border border-yellow-100 text-yellow-900">{po.notes}</p>
        </section>
      )}

      <div className="flex flex-wrap gap-4 pt-4 border-t border-border">
        <Link
          href={`/receipts?poId=${po.id}`}
          className={buttonVariants({ variant: "outline" })}
        >
          <Package className="size-4 mr-2" />
          Voir les réceptions ({po.receipts.length})
        </Link>
        {po.status !== "DRAFT" && po.status !== "CANCELLED" && (
          <Link
            href={`/purchase-orders/${po.id}/receipts/new`}
            className={buttonVariants({ variant: "default" })}
          >
            + Saisir une réception
          </Link>
        )}
      </div>

      <div className="flex flex-wrap gap-4 pt-4 border-t border-border">
        <Link
          href={`/invoices?poId=${po.id}`}
          className={buttonVariants({ variant: "outline" })}
        >
          <ReceiptText className="size-4 mr-2" />
          Voir les factures ({po.invoices.length})
        </Link>
        {po.status !== "DRAFT" && po.status !== "CANCELLED" && (
          <Link
            href={`/purchase-orders/${po.id}/invoices/new`}
            className={buttonVariants({ variant: "default" })}
          >
            + Saisir une facture
          </Link>
        )}
      </div>
    </div>
  );
}
