import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { getOrgContext } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";

import { CompareMatrix } from "@/components/rfq/compare-matrix";

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
      const prices: Record<string, number> = {};
      for (const qi of r.quote.items) {
        prices[qi.productId] = qi.unitPrice;
      }
      
      const shippingCost = r.quote.shippingCost ?? 0;
      const total =
        rfq.items.reduce(
          (s, it) => s + (prices[it.productId] ?? 0) * it.quantity,
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

  const items = rfq.items.map((it) => ({
    id: it.id,
    productId: it.productId,
    name: it.product.name,
    quantity: it.quantity,
    unit: it.product.unit,
  }));

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

  const isClosed = rfq.status === "CLOSED";

  return (
    <>
      {back}
      <PageHeader
        title={`Comparaison — ${rfq.reference}`}
        description={isClosed ? "L'adjudication est terminée." : "Cliquez sur les prix pour sélectionner le meilleur fournisseur ligne par ligne."}
      />

      <CompareMatrix
        rfqId={rfq.id}
        items={items}
        cols={cols}
        isClosed={isClosed}
      />
    </>
  );
}
