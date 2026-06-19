import { CreditCard, ReceiptText } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
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
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata = { title: "Factures fournisseurs" };

export default async function InvoicesPage(props: {
  searchParams?: Promise<{ poId?: string }>;
}) {
  const searchParams = await props.searchParams;
  const poId = searchParams?.poId;
  const { orgId } = await getOrgContext();

  const invoices = await prisma.invoice.findMany({
    where: { 
      po: { orgId },
      ...(poId ? { poId } : {})
    },
    include: {
      po: {
        include: { supplier: true }
      },
      payments: true,
    },
    orderBy: { date: "desc" },
  });

  // Calculate totals
  const totalUnpaid = invoices.reduce((sum, inv) => {
    const paid = inv.payments.reduce((s, p) => s + p.amount, 0);
    const remaining = inv.amountTTC - paid;
    return sum + (remaining > 0.01 ? remaining : 0);
  }, 0);
  const unpaidCount = invoices.filter(inv => {
    const paid = inv.payments.reduce((s, p) => s + p.amount, 0);
    return inv.amountTTC - paid > 0.01;
  }).length;

  return (
    <>
      <PageHeader
        title="Factures Fournisseurs"
        description={poId ? "Filtrées pour une commande spécifique" : "Gestion comptable des factures d'achat"}
      />

      {/* Summary bar */}
      {invoices.length > 0 && (
        <div className="flex flex-wrap gap-4">
          <div className="rounded-xl border border-border bg-white shadow-sm p-4 flex-1 min-w-[200px]">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total factures</p>
            <p className="text-2xl font-bold tabular-nums mt-1">{invoices.length}</p>
          </div>
          <div className="rounded-xl border border-red-200 bg-red-50 shadow-sm p-4 flex-1 min-w-[200px]">
            <p className="text-xs font-medium text-red-600 uppercase tracking-wider">En attente de paiement</p>
            <p className="text-2xl font-bold tabular-nums text-red-700 mt-1">
              {unpaidCount} — {formatCurrency(totalUnpaid)}
            </p>
          </div>
        </div>
      )}

      {invoices.length === 0 ? (
        <EmptyState
          icon={ReceiptText}
          title="Aucune facture"
          description="Vous n'avez pas encore de facture fournisseur enregistrée."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Facture</TableHead>
                <TableHead>Fournisseur</TableHead>
                <TableHead>Commande</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Montant TTC</TableHead>
                <TableHead className="text-right">Reste à payer</TableHead>
                <TableHead className="text-right">Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((inv) => {
                const totalPaid = inv.payments.reduce((sum, p) => sum + p.amount, 0);
                const remaining = inv.amountTTC - totalPaid;
                const isPaid = inv.status === "PAID" || remaining <= 0.01;

                return (
                  <TableRow key={inv.id}>
                    <TableCell className="font-semibold">
                      {inv.reference}
                    </TableCell>
                    <TableCell>{inv.po.supplier.name}</TableCell>
                    <TableCell>
                      <Link
                        href={`/purchase-orders/${inv.poId}`}
                        className="hover:underline text-blue-600 text-sm"
                      >
                        {inv.po.reference}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(inv.date)}
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {formatCurrency(inv.amountTTC)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {isPaid ? (
                        <span className="text-green-600 font-medium">0,00</span>
                      ) : (
                        <span className="text-red-600 font-bold">{formatCurrency(remaining)}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={isPaid ? "default" : (inv.status === "PARTIALLY_PAID" ? "secondary" : "outline")} className={cn(isPaid && "bg-green-600")}>
                        {isPaid ? "Payée" : (inv.status === "PARTIALLY_PAID" ? "Partiellement Payée" : "En attente")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {inv.fileUrl && (
                          <a href={inv.fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline font-medium">
                            PDF
                          </a>
                        )}
                        {!isPaid && (
                          <Link
                            href={`/purchase-orders/${inv.poId}/invoices/${inv.id}/payments/new`}
                            className={buttonVariants({ variant: "default", size: "sm" })}
                          >
                            <CreditCard className="size-3.5 mr-1.5" />
                            Payer
                          </Link>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
