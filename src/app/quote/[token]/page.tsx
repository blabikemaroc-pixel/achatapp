import { ShoppingCart } from "lucide-react";
import { notFound } from "next/navigation";

import {
  type QuoteFormItem,
  type QuoteInitial,
} from "@/components/quote/quote-form";
import { QuotePortalClient } from "@/components/quote/quote-portal-client";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";

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
      supplier: { select: { name: true } },
      quote: { include: { items: true } },
      rfq: {
        include: {
          items: {
            include: { product: { select: { id: true, name: true, unit: true } } },
          },
          org: { select: { name: true } },
        },
      },
    },
  });
  if (!recipient) notFound();

  const { rfq, supplier, quote } = recipient;

  const items: QuoteFormItem[] = rfq.items.map((it) => ({
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
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 p-4 sm:p-8">
      <header className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <ShoppingCart className="size-5" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{rfq.org.name}</p>
          <h1 className="text-lg font-semibold">
            Demande de prix {rfq.reference}
          </h1>
        </div>
      </header>

      <div className="space-y-1">
        <p className="text-sm">
          Bonjour <strong>{supplier.name}</strong>, merci d&apos;indiquer votre
          meilleure offre
          {rfq.dueDate ? (
            <>
              {" "}
              avant le <strong>{formatDate(rfq.dueDate)}</strong>
            </>
          ) : null}
          .
        </p>
        {rfq.notes ? (
          <p className="text-sm text-muted-foreground">{rfq.notes}</p>
        ) : null}
      </div>

      <QuotePortalClient
        token={token}
        items={items}
        initial={initial}
        alreadyResponded={!!quote}
      />
    </div>
  );
}
