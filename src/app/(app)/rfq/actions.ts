"use server";

import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";

import { getOrgContext } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { rfqEmailTemplate, sendMail } from "@/lib/email";
import { saveQuote } from "@/lib/quote";
import {
  quoteSchema,
  rfqSchema,
  type QuoteInput,
  type RfqInput,
} from "@/lib/validators";

export async function createRfq(input: RfqInput) {
  const { orgId, orgName } = await getOrgContext();
  const parsed = rfqSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Champs invalides." };
  }
  const { title, notes, dueDate, items, supplierIds } = parsed.data;

  // Produits réellement dans l'org
  const products = await prisma.product.findMany({
    where: { orgId, id: { in: items.map((i) => i.productId) } },
    select: { id: true, name: true, unit: true },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));
  const validItems = items.filter((i) => productMap.has(i.productId));
  if (validItems.length === 0) return { error: "Aucun produit valide." };

  // Fournisseurs réellement dans l'org
  const suppliers = await prisma.supplier.findMany({
    where: { orgId, id: { in: supplierIds } },
    select: { id: true, name: true, email: true },
  });
  if (suppliers.length === 0) return { error: "Aucun fournisseur valide." };

  // Référence RFQ-AAAA-NNN
  const year = new Date().getFullYear();
  const count = await prisma.rfq.count({ where: { orgId } });
  const reference = `RFQ-${year}-${String(count + 1).padStart(3, "0")}`;
  const due = dueDate ? new Date(dueDate) : null;

  const rfq = await prisma.rfq.create({
    data: {
      orgId,
      reference,
      title: title?.trim() || null,
      notes: notes?.trim() || null,
      dueDate: due,
      status: "SENT",
      items: {
        create: validItems.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
        })),
      },
      recipients: {
        create: suppliers.map((s) => ({
          supplierId: s.id,
          token: nanoid(24),
          status: "SENT",
          sentAt: new Date(),
        })),
      },
    },
    include: { recipients: { include: { supplier: true } } },
  });

  // Envoi des e-mails (best-effort : un échec n'annule pas la demande)
  const appUrl = process.env.APP_URL ?? "http://localhost:3010";
  const emailItems = validItems.map((i) => ({
    name: productMap.get(i.productId)!.name,
    quantity: i.quantity,
    unit: productMap.get(i.productId)!.unit,
  }));

  await Promise.allSettled(
    rfq.recipients.map((r) => {
      const tpl = rfqEmailTemplate({
        orgName,
        supplierName: r.supplier.name,
        reference,
        dueDate: due,
        items: emailItems,
        link: `${appUrl}/quote/${r.token}`,
      });
      return sendMail({ to: r.supplier.email, ...tpl });
    }),
  );

  revalidatePath("/rfq");
  revalidatePath("/dashboard");
  return { success: true, id: rfq.id };
}

// Saisie manuelle d'un devis par l'acheteur (fournisseur ayant répondu hors app).
export async function enterQuote(recipientId: string, input: QuoteInput) {
  const { orgId } = await getOrgContext();
  const parsed = quoteSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Champs invalides." };
  }

  const recipient = await prisma.rfqRecipient.findFirst({
    where: { id: recipientId, rfq: { orgId } },
    include: { rfq: { include: { items: { select: { productId: true } } } } },
  });
  if (!recipient) return { error: "Destinataire introuvable." };

  const res = await saveQuote(
    recipientId,
    recipient.rfq.items.map((i) => i.productId),
    parsed.data,
  );
  if (res.error) return res;

  revalidatePath(`/rfq/${recipient.rfqId}`);
  return { success: true };
}

// Choisir le devis gagnant : le marque SELECTED, les autres de la même RFQ REJECTED.
export async function selectQuote(quoteId: string) {
  const { orgId } = await getOrgContext();

  const quote = await prisma.quote.findFirst({
    where: { id: quoteId, recipient: { rfq: { orgId } } },
    include: { recipient: { select: { rfqId: true } } },
  });
  if (!quote) return { error: "Devis introuvable." };

  const rfqId = quote.recipient.rfqId;
  await prisma.$transaction([
    prisma.quote.updateMany({
      where: { recipient: { rfqId } },
      data: { status: "REJECTED" },
    }),
    prisma.quote.update({ where: { id: quoteId }, data: { status: "SELECTED" } }),
  ]);

  revalidatePath(`/rfq/${rfqId}`);
  revalidatePath(`/rfq/${rfqId}/compare`);
  revalidatePath("/dashboard");
  return { success: true };
}

// Adjudication fractionnée : choisir différents fournisseurs pour différents produits.
// Cela crée un Bon de Commande par fournisseur gagnant.
export async function awardSplitQuotes(
  rfqId: string,
  awards: { productId: string; quoteId: string }[]
) {
  const { orgId } = await getOrgContext();

  const rfq = await prisma.rfq.findFirst({
    where: { id: rfqId, orgId },
    include: {
      items: true,
      recipients: {
        include: { quote: { include: { items: true } }, supplier: true },
      },
    },
  });
  if (!rfq) return { error: "Demande introuvable." };

  // Grouper les attributions par quoteId
  const awardsByQuote = new Map<string, string[]>();
  for (const { productId, quoteId } of awards) {
    if (!awardsByQuote.has(quoteId)) awardsByQuote.set(quoteId, []);
    awardsByQuote.get(quoteId)!.push(productId);
  }

  const newPoIds: string[] = [];

  await prisma.$transaction(async (tx) => {
    // 1. Marquer les devis
    const allQuoteIds = rfq.recipients.map((r) => r.quote?.id).filter(Boolean) as string[];
    const winningQuoteIds = Array.from(awardsByQuote.keys());
    
    await tx.quote.updateMany({
      where: { id: { in: allQuoteIds, notIn: winningQuoteIds } },
      data: { status: "REJECTED" },
    });
    
    await tx.quote.updateMany({
      where: { id: { in: winningQuoteIds } },
      data: { status: "SELECTED" },
    });

    // 2. Créer un PO pour chaque devis gagnant
    for (const [quoteId, productIds] of awardsByQuote.entries()) {
      const recipient = rfq.recipients.find((r) => r.quote?.id === quoteId);
      if (!recipient || !recipient.quote) continue;

      const quote = recipient.quote;
      const supplierId = recipient.supplierId;

      // On récupère les items de la quote qui ont été attribués
      const awardedQuoteItems = quote.items.filter((qi) => productIds.includes(qi.productId));
      if (awardedQuoteItems.length === 0) continue;

      // On calcule le total pour ce PO spécifique
      const poItems = awardedQuoteItems.map((qi) => {
        // Retrouver la quantité demandée initialement pour ce produit
        const rfqItem = rfq.items.find((ri) => ri.productId === qi.productId);
        return {
          productId: qi.productId,
          quantity: rfqItem?.quantity ?? 1,
          unitPrice: qi.unitPrice,
        };
      });

      const shipping = quote.shippingCost ?? 0;
      const total = poItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0) + shipping;

      // Générer la référence BC
      const year = new Date().getFullYear();
      const count = await tx.purchaseOrder.count({ where: { orgId } });
      const reference = `BC-${year}-${String(count + 1).padStart(3, "0")}`;

      const po = await tx.purchaseOrder.create({
        data: {
          orgId,
          reference,
          supplierId,
          quoteId,
          status: "DRAFT",
          total,
          notes: quote.notes,
          items: {
            create: poItems.map((i) => ({
              productId: i.productId,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
            })),
          },
        },
      });
      newPoIds.push(po.id);
    }
    
    // Fermer la demande de prix
    await tx.rfq.update({
      where: { id: rfqId },
      data: { status: "CLOSED" },
    });
  });

  revalidatePath(`/rfq/${rfqId}`);
  revalidatePath(`/rfq/${rfqId}/compare`);
  revalidatePath("/purchase-orders");
  revalidatePath("/dashboard");
  return { success: true, poIds: newPoIds };
}
