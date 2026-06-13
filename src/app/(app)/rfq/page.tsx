import { FileText, Plus } from "lucide-react";
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
import { formatDate } from "@/lib/format";

export const metadata = { title: "Demandes de prix" };

const statusLabel = {
  DRAFT: { label: "Brouillon", variant: "outline" as const },
  SENT: { label: "Envoyée", variant: "default" as const },
  CLOSED: { label: "Clôturée", variant: "secondary" as const },
};

export default async function RfqPage() {
  const { orgId } = await getOrgContext();
  const rfqs = await prisma.rfq.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      reference: true,
      title: true,
      status: true,
      dueDate: true,
      createdAt: true,
      recipients: { select: { status: true } },
      _count: { select: { items: true } },
    },
  });

  return (
    <>
      <PageHeader
        title="Demandes de prix"
        description="Consultez plusieurs fournisseurs et comparez leurs devis."
        action={
          <Link href="/rfq/new" className={buttonVariants()}>
            <Plus className="size-4" />
            Nouvelle demande
          </Link>
        }
      />

      {rfqs.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Aucune demande de prix"
          description="Créez votre première demande : produits, fournisseurs, envoi par e-mail."
          action={
            <Link href="/rfq/new" className={buttonVariants()}>
              <Plus className="size-4" />
              Nouvelle demande
            </Link>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Référence</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Produits</TableHead>
                <TableHead className="text-right">Réponses</TableHead>
                <TableHead>Date limite</TableHead>
                <TableHead>Créée le</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rfqs.map((rfq) => {
                const responded = rfq.recipients.filter(
                  (r) => r.status === "RESPONDED",
                ).length;
                const status = statusLabel[rfq.status];
                return (
                  <TableRow key={rfq.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/rfq/${rfq.id}`}
                        className="hover:underline"
                      >
                        {rfq.reference}
                      </Link>
                      {rfq.title ? (
                        <span className="block text-xs font-normal text-muted-foreground">
                          {rfq.title}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {rfq._count.items}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {responded}/{rfq.recipients.length}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(rfq.dueDate)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(rfq.createdAt)}
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
