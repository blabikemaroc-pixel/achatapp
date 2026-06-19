import { notFound } from "next/navigation";

import {
  type QuoteFormItem,
  type QuoteInitial,
} from "@/components/quote/quote-form";
import { QuotePortalClient } from "@/components/quote/quote-portal-client";
import { prisma } from "@/lib/db";

export const metadata = { title: "Demande de prix" };

export default async function QuotePortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const recipient = await prisma.rfqRecipient.findUnique({
    where: { token },
    include: {
      supplier: {
        select: {
          name: true,
          supplierProducts: { select: { productId: true } },
        },
      },
      quote: { include: { items: true } },
      rfq: {
        include: {
          items: {
            include: { product: { select: { id: true, name: true, unit: true } } },
          },
          org: { select: { name: true, city: true } },
        },
      },
    },
  });
  if (!recipient) notFound();

  const { rfq, supplier, quote } = recipient;

  // Le fournisseur ne cote que les produits qu'il fournit (∩ produits demandés).
  const suppliedIds = new Set(
    supplier.supplierProducts.map((sp) => sp.productId),
  );
  const filtered = rfq.items.filter((it) => suppliedIds.has(it.productId));
  const items: QuoteFormItem[] = (
    filtered.length > 0 ? filtered : rfq.items
  ).map((it) => ({
    productId: it.productId,
    name: it.product.name,
    unit: it.product.unit,
    requestedQty: it.quantity,
  }));

  let initial: QuoteInitial | undefined;
  if (quote) {
    const prices: Record<string, string> = {};
    const minQtys: Record<string, string> = {};
    for (const qi of quote.items) {
      prices[qi.productId] = String(qi.unitPrice);
      if (qi.minQty != null) minQtys[qi.productId] = String(qi.minQty);
    }
    initial = {
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

  return (
    <div className="mx-auto flex min-h-dvh max-w-7xl flex-col gap-6 p-4 sm:p-8 bg-slate-50">
      <QuotePortalClient
        token={token}
        items={items}
        initial={initial}
        alreadyResponded={!!quote}
        supplierName={supplier.name}
        orgName={rfq.org.name}
        orgCity={rfq.org.city}
        rfqReference={rfq.reference}
        rfqNotes={rfq.notes}
      />
    </div>
  );
}
