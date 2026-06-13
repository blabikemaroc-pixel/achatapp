import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import {
  type QuoteFormItem,
  type QuoteInitial,
} from "@/components/quote/quote-form";
import { QuoteEntryButton } from "@/components/rfq/quote-entry-button";
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

export const metadata = { title: "Demande de prix" };

const recipientStatus = {
  PENDING: { label: "En attente", variant: "outline" as const },
  SENT: { label: "Envoyée", variant: "secondary" as const },
  RESPONDED: { label: "Devis reçu", variant: "default" as const },
  DECLINED: { label: "Décliné", variant: "outline" as const },
};

type QuoteWithItems = {
  deliveryDays: number | null;
  paymentTerms: string | null;
  shippingCost: number | null;
  validUntil: Date | null;
  notes: string | null;
  items: { productId: string; unitPrice: number; minQty: number | null }[];
};

function toInitial(quote: QuoteWithItems): QuoteInitial {
  const prices: Record<string, string> = {};
  const minQtys: Record<string, string> = {};
  for (const qi of quote.items) {
    prices[qi.productId] = String(qi.unitPrice);
    if (qi.minQty != null) minQtys[qi.productId] = String(qi.minQty);
  }
  return {
    deliveryDays: quote.deliveryDays,
    paymentTerms: quote.paymentTerms,
    shippingCost: quote.shippingCost,
    validUntil: quote.validUntil
      ? quote.validUntil.toISOString().slice(0, 10)
      : null,
    notes: quote.notes,
    prices,
    minQtys,
  };
}

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
      items: {
        include: { product: { select: { id: true, name: true, unit: true } } },
      },
      recipients: {
        include: {
          supplier: { select: { name: true, email: true } },
          quote: { include: { items: true } },
        },
        orderBy: { supplier: { name: "asc" } },
      },
    },
  });
  if (!rfq) notFound();

  const appUrl = process.env.APP_URL ?? "http://localhost:3010";
  const qtyByProduct = new Map(rfq.items.map((i) => [i.productId, i.quantity]));
  const formItems: QuoteFormItem[] = rfq.items.map((i) => ({
    productId: i.productId,
    name: i.product.name,
    unit: i.product.unit,
    requestedQty: i.quantity,
  }));

  const quoteTotal = (quote: QuoteWithItems) =>
    quote.items.reduce(
      (sum, qi) => sum + qi.unitPrice * (qtyByProduct.get(qi.productId) ?? 0),
      0,
    ) + (quote.shippingCost ?? 0);

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
          Fournisseurs & devis
        </h2>
        <div className="overflow-hidden rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fournisseur</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Total devis</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rfq.recipients.map((recipient) => {
                const status = recipientStatus[recipient.status];
                const total = recipient.quote
                  ? quoteTotal(recipient.quote)
                  : null;
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
                    <TableCell className="text-right font-medium tabular-nums">
                      {total != null ? formatCurrency(total) : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <QuoteEntryButton
                          recipientId={recipient.id}
                          supplierName={recipient.supplier.name}
                          items={formItems}
                          initial={
                            recipient.quote
                              ? toInitial(recipient.quote)
                              : undefined
                          }
                          hasQuote={!!recipient.quote}
                        />
                        <a
                          href={`${appUrl}/quote/${recipient.token}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={buttonVariants({
                            variant: "ghost",
                            size: "sm",
                          })}
                        >
                          Lien
                        </a>
                      </div>
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
