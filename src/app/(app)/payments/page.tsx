import { CreditCard } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
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

export const metadata = { title: "Historique des paiements" };

const methodLabels: Record<string, string> = {
  VIREMENT: "Virement bancaire",
  CHEQUE: "Chèque",
  ESPECES: "Espèces",
  CARTE: "Carte bancaire",
};

export default async function PaymentsPage() {
  const { orgId } = await getOrgContext();

  const payments = await prisma.payment.findMany({
    where: { 
      invoice: { po: { orgId } }
    },
    include: {
      invoice: {
        include: { po: { include: { supplier: true } } }
      }
    },
    orderBy: { date: "desc" },
  });

  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);

  return (
    <>
      <PageHeader
        title="Historique des paiements"
        description="Relevé comptable de toutes les sorties de trésorerie"
      />

      {/* Summary */}
      {payments.length > 0 && (
        <div className="flex flex-wrap gap-4">
          <div className="rounded-xl border border-border bg-white shadow-sm p-4 flex-1 min-w-[200px]">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total décaissé</p>
            <p className="text-2xl font-bold tabular-nums mt-1">{formatCurrency(totalPaid)}</p>
          </div>
          <div className="rounded-xl border border-border bg-white shadow-sm p-4 flex-1 min-w-[200px]">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Nombre de paiements</p>
            <p className="text-2xl font-bold tabular-nums mt-1">{payments.length}</p>
          </div>
        </div>
      )}

      {payments.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="Aucun paiement"
          description="Les paiements sont enregistrés depuis la page Factures."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Méthode</TableHead>
                <TableHead>Réf. Transaction</TableHead>
                <TableHead>Fournisseur</TableHead>
                <TableHead>Facture liée</TableHead>
                <TableHead className="text-right">Montant</TableHead>
                <TableHead className="text-right">Preuve</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    {formatDate(p.date)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{methodLabels[p.method] ?? p.method}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {p.reference || "—"}
                  </TableCell>
                  <TableCell>
                    {p.invoice.po.supplier.name}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/purchase-orders/${p.invoice.poId}`}
                      className="hover:underline text-blue-600 text-sm"
                    >
                      {p.invoice.reference}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right font-bold tabular-nums text-slate-900">
                    {formatCurrency(p.amount)}
                  </TableCell>
                  <TableCell className="text-right">
                    {p.fileUrl ? (
                      <a href={p.fileUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline font-medium">
                        Voir
                      </a>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
