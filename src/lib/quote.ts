import { prisma } from "@/lib/db";
import type { QuoteInput } from "@/lib/validators";

// Enregistre (ou met à jour) le devis d'un destinataire de RFQ et le marque
// comme « répondu ». Utilisé à la fois par le portail public (lien magique)
// et par la saisie manuelle côté acheteur.
export async function saveQuote(
  recipientId: string,
  rfqProductIds: string[],
  input: QuoteInput,
): Promise<{ error?: string; success?: boolean }> {
  const allowed = new Set(rfqProductIds);
  const items = input.items.filter(
    (i) => allowed.has(i.productId) && i.unitPrice > 0,
  );
  if (items.length === 0) return { error: "Aucun prix valide." };

  const data = {
    deliveryDays: input.deliveryDays ?? null,
    paymentTerms: input.paymentTerms?.trim() || null,
    shippingCost: input.shippingCost ?? 0,
    validUntil: input.validUntil ? new Date(input.validUntil) : null,
    notes: input.notes?.trim() || null,
    status: "RECEIVED" as const,
  };

  await prisma.$transaction(async (tx) => {
    const quote = await tx.quote.upsert({
      where: { recipientId },
      create: { recipientId, ...data },
      update: data,
    });
    await tx.quoteItem.deleteMany({ where: { quoteId: quote.id } });
    await tx.quoteItem.createMany({
      data: items.map((i) => ({
        quoteId: quote.id,
        productId: i.productId,
        unitPrice: i.unitPrice,
        minQty: i.minQty ?? null,
      })),
    });
    await tx.rfqRecipient.update({
      where: { id: recipientId },
      data: { status: "RESPONDED", respondedAt: new Date() },
    });
  });

  return { success: true };
}
