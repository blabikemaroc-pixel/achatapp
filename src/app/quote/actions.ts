"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { saveQuote } from "@/lib/quote";
import { quoteSchema, type QuoteInput } from "@/lib/validators";

// Action PUBLIQUE : le fournisseur soumet son devis via son lien magique.
// La sécurité repose sur la possession du token (secret, non devinable).
export async function submitQuote(token: string, input: QuoteInput) {
  const parsed = quoteSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Champs invalides." };
  }

  const recipient = await prisma.rfqRecipient.findUnique({
    where: { token },
    include: { rfq: { include: { items: { select: { productId: true } } } } },
  });
  if (!recipient) return { error: "Lien invalide ou expiré." };

  const res = await saveQuote(
    recipient.id,
    recipient.rfq.items.map((i) => i.productId),
    parsed.data,
  );
  if (res.error) return res;

  revalidatePath(`/rfq/${recipient.rfqId}`);
  return { success: true };
}
