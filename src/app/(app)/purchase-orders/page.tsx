import { ClipboardList } from "lucide-react";
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

export const metadata = { title: "Bons de commande" };

const poStatus = {
  DRAFT: { label: "Brouillon", variant: "outline" as const },
  SENT: { label: "Envoyé", variant: "default" as const },
  CONFIRMED: { label: "Confirmé", variant: "secondary" as const },
  PARTIALLY_RECEIVED: { label: "Partiellement Reçu", variant: "secondary" as const },
  RECEIVED: { label: "Réceptionné", variant: "default" as const },
  INVOICED: { label: "Facturé", variant: "default" as const },
  CANCELLED: { label: "Annulé", variant: "outline" as const },
};

export default async function PurchaseOrdersPage() {
  const { orgId } = await getOrgContext();
  const orders = await prisma.purchaseOrder.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      reference: true,
      status: true,
      total: true,
      createdAt: true,
      supplier: { select: { name: true } },
    },
  });

  return (
    <>
      <PageHeader
        title="Bons de commande"
        description="Générés depuis les devis retenus, envoyés aux fournisseurs."
      />

      {orders.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Aucun bon de commande"
          description="Choisissez un devis gagnant dans une demande de prix, puis générez le bon de commande."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Référence</TableHead>
                <TableHead>Fournisseur</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Créé le</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((po) => {
                const status = poStatus[po.status];
                return (
                  <TableRow key={po.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/purchase-orders/${po.id}`}
                        className="hover:underline"
                      >
                        {po.reference}
                      </Link>
                    </TableCell>
                    <TableCell>{po.supplier.name}</TableCell>
                    <TableCell>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatCurrency(po.total)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(po.createdAt)}
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
