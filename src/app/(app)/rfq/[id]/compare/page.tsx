import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { SelectWinnerButton } from "@/components/rfq/select-winner-button";
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
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata = { title: "Comparaison des devis" };

export default async function CompareQuotesPage({
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
          supplier: { select: { name: true } },
          quote: { include: { items: true } },
        },
        orderBy: { supplier: { name: "asc" } },
      },
    },
  });
  if (!rfq) notFound();

  const cols = rfq.recipients
    .map((r) => {
      if (!r.quote) return null;
      const prices = new Map(
        r.quote.items.map((qi) => [qi.productId, qi.unitPrice]),
      );
      const shippingCost = r.quote.shippingCost ?? 0;
      const total =
        rfq.items.reduce(
          (s, it) => s + (prices.get(it.productId) ?? 0) * it.quantity,
          0,
        ) + shippingCost;
      return {
        quoteId: r.quote.id,
        name: r.supplier.name,
        status: r.quote.status,
        deliveryDays: r.quote.deliveryDays,
        paymentTerms: r.quote.paymentTerms,
        shippingCost,
        validUntil: r.quote.validUntil,
        prices,
        total,
      };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);

  const back = (
    <Link
      href={`/rfq/${rfq.id}`}
      className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="size-4" /> Retour à la demande
    </Link>
  );

  if (cols.length === 0) {
    return (
      <>
        {back}
        <PageHeader
          title={`Comparaison — ${rfq.reference}`}
          description="Comparez les devis reçus côte à côte."
        />
        <EmptyState
          title="Aucun devis reçu"
          description="Dès qu'un fournisseur répond (ou que vous saisissez son devis), il apparaîtra ici."
        />
      </>
    );
  }

  const minTotal = Math.min(...cols.map((c) => c.total));
  const minDelivery = Math.min(
    ...cols.map((c) => c.deliveryDays ?? Number.POSITIVE_INFINITY),
  );
  const minPriceByProduct = new Map(
    rfq.items.map((it) => [
      it.productId,
      Math.min(
        ...cols.map((c) => c.prices.get(it.productId) ?? Number.POSITIVE_INFINITY),
      ),
    ]),
  );

  const best = "bg-primary/10 font-semibold text-primary";

  return (
    <>
      {back}
      <PageHeader
        title={`Comparaison — ${rfq.reference}`}
        description="Le meilleur prix de chaque ligne et le meilleur total sont mis en évidence."
      />

      <div className="overflow-hidden rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-40">Produit</TableHead>
              {cols.map((c) => (
                <TableHead key={c.quoteId} className="min-w-36 text-right">
                  <div className="flex flex-col items-end gap-1">
                    <span className="font-medium text-foreground">{c.name}</span>
                    {c.status === "SELECTED" ? (
                      <Badge>Retenu</Badge>
                    ) : null}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rfq.items.map((it) => {
              const minPrice = minPriceByProduct.get(it.productId);
              return (
                <TableRow key={it.id}>
                  <TableCell>
                    <span className="font-medium">{it.product.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {formatNumber(it.quantity)} {it.product.unit}
                    </span>
                  </TableCell>
                  {cols.map((c) => {
                    const price = c.prices.get(it.productId);
                    const isBest = price != null && price === minPrice;
                    return (
                      <TableCell
                        key={c.quoteId}
                        className={cn(
                          "text-right tabular-nums",
                          isBest && best,
                        )}
                      >
                        {price != null ? formatCurrency(price) : "—"}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}

            <TableRow>
              <TableCell className="font-medium">Frais de port</TableCell>
              {cols.map((c) => (
                <TableCell key={c.quoteId} className="text-right tabular-nums">
                  {formatCurrency(c.shippingCost)}
                </TableCell>
              ))}
            </TableRow>

            <TableRow className="border-t-2 border-border">
              <TableCell className="font-semibold">Total</TableCell>
              {cols.map((c) => (
                <TableCell
                  key={c.quoteId}
                  className={cn(
                    "text-right text-base tabular-nums",
                    c.total === minTotal ? best : "font-semibold",
                  )}
                >
                  {formatCurrency(c.total)}
                </TableCell>
              ))}
            </TableRow>

            <TableRow>
              <TableCell className="text-muted-foreground">
                Délai de livraison
              </TableCell>
              {cols.map((c) => (
                <TableCell
                  key={c.quoteId}
                  className={cn(
                    "text-right tabular-nums",
                    c.deliveryDays != null &&
                      c.deliveryDays === minDelivery &&
                      best,
                  )}
                >
                  {c.deliveryDays != null ? `${c.deliveryDays} j` : "—"}
                </TableCell>
              ))}
            </TableRow>

            <TableRow>
              <TableCell className="text-muted-foreground">
                Conditions de paiement
              </TableCell>
              {cols.map((c) => (
                <TableCell key={c.quoteId} className="text-right text-sm">
                  {c.paymentTerms ?? "—"}
                </TableCell>
              ))}
            </TableRow>

            <TableRow>
              <TableCell className="text-muted-foreground">Validité</TableCell>
              {cols.map((c) => (
                <TableCell key={c.quoteId} className="text-right text-sm">
                  {formatDate(c.validUntil)}
                </TableCell>
              ))}
            </TableRow>

            <TableRow>
              <TableCell className="text-muted-foreground">Décision</TableCell>
              {cols.map((c) => (
                <TableCell key={c.quoteId} className="text-right">
                  <div className="flex justify-end">
                    <SelectWinnerButton
                      quoteId={c.quoteId}
                      selected={c.status === "SELECTED"}
                    />
                  </div>
                </TableCell>
              ))}
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </>
  );
}
