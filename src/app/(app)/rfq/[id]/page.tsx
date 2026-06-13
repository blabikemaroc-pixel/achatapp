import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

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
import { formatDate, formatNumber } from "@/lib/format";

export const metadata = { title: "Demande de prix" };

const recipientStatus = {
  PENDING: { label: "En attente", variant: "outline" as const },
  SENT: { label: "Envoyée", variant: "secondary" as const },
  RESPONDED: { label: "Devis reçu", variant: "default" as const },
  DECLINED: { label: "Décliné", variant: "outline" as const },
};

export default async function RfqDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { orgId } = await getOrgContext();

  const rfq = await prisma.rfq.findFirst({
    where: { id, orgId },
    include: {
      items: { include: { product: { select: { name: true, unit: true } } } },
      recipients: {
        include: { supplier: { select: { name: true, email: true } } },
        orderBy: { supplier: { name: "asc" } },
      },
    },
  });
  if (!rfq) notFound();

  const appUrl = process.env.APP_URL ?? "http://localhost:3010";

  return (
    <>
      <Link
        href="/rfq"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Retour aux demandes
      </Link>

      <PageHeader title={rfq.reference} description={rfq.title ?? undefined} />

      <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
        <span>
          Date limite :{" "}
          <span className="text-foreground">{formatDate(rfq.dueDate)}</span>
        </span>
        <span>
          Créée le :{" "}
          <span className="text-foreground">{formatDate(rfq.createdAt)}</span>
        </span>
      </div>
      {rfq.notes ? <p className="text-sm">{rfq.notes}</p> : null}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">
          Produits demandés
        </h2>
        <div className="overflow-hidden rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produit</TableHead>
                <TableHead className="text-right">Quantité</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rfq.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    {item.product.name}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(item.quantity)} {item.product.unit}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">
          Fournisseurs consultés
        </h2>
        <div className="overflow-hidden rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fournisseur</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Lien fournisseur</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rfq.recipients.map((recipient) => {
                const status = recipientStatus[recipient.status];
                return (
                  <TableRow key={recipient.id}>
                    <TableCell>
                      <span className="font-medium">
                        {recipient.supplier.name}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {recipient.supplier.email}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <a
                        href={`${appUrl}/quote/${recipient.token}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        Ouvrir
                      </a>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </section>
    </>
  );
}
