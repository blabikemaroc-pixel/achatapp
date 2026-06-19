"use server";

import { revalidatePath } from "next/cache";

import { getOrgContext } from "@/lib/auth-helpers";
import { APP_CURRENCY } from "@/lib/config";
import { prisma } from "@/lib/db";
import { poEmailTemplate, sendMail } from "@/lib/email";
import { saveFile } from "@/lib/files";
import { generatePoPdf, loadPoPdfData } from "@/lib/po-pdf";

function money(value: number) {
  return `${value.toFixed(2).replace(".", ",")} ${APP_CURRENCY}`;
}

export async function createPurchaseOrderFromQuote(quoteId: string) {
  const { orgId } = await getOrgContext();

  const quote = await prisma.quote.findFirst({
    where: { id: quoteId, recipient: { rfq: { orgId } } },
    include: {
      items: true,
      recipient: {
        include: {
          supplier: { select: { id: true } },
          rfq: {
            include: {
              items: {
                include: { product: { select: { id: true } } },
              },
            },
          },
        },
      },
    },
  });
  if (!quote) return { error: "Devis introuvable." };

  // Un seul bon de commande par devis.
  const existing = await prisma.purchaseOrder.findFirst({
    where: { orgId, quoteId },
    select: { id: true },
  });
  if (existing) return { success: true, id: existing.id };

  const priceByProduct = new Map(
    quote.items.map((qi) => [qi.productId, qi.unitPrice]),
  );
  const poItems = quote.recipient.rfq.items
    .map((it) => ({
      productId: it.productId,
      quantity: it.quantity,
      unitPrice: priceByProduct.get(it.productId) ?? 0,
    }))
    .filter((i) => i.unitPrice > 0);
  if (poItems.length === 0) return { error: "Le devis ne contient aucun prix." };

  const shipping = quote.shippingCost ?? 0;
  const total =
    poItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0) + shipping;

  const year = new Date().getFullYear();
  const count = await prisma.purchaseOrder.count({ where: { orgId } });
  const reference = `BC-${year}-${String(count + 1).padStart(3, "0")}`;

  const po = await prisma.purchaseOrder.create({
    data: {
      orgId,
      reference,
      supplierId: quote.recipient.supplierId,
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

  revalidatePath("/purchase-orders");
  revalidatePath("/dashboard");
  return { success: true, id: po.id };
}

export async function sendPurchaseOrder(poId: string) {
  const { orgId, orgName } = await getOrgContext();

  const data = await loadPoPdfData(poId, orgId);
  if (!data) return { error: "Bon de commande introuvable." };

  const pdf = await generatePoPdf(data);
  const tpl = poEmailTemplate({
    orgName,
    supplierName: data.supplier.name,
    reference: data.reference,
    total: money(data.total),
  });

  try {
    await sendMail({
      to: data.supplier.email,
      ...tpl,
      attachments: [
        { filename: `${data.reference}.pdf`, content: Buffer.from(pdf) },
      ],
    });
  } catch {
    return { error: "Échec de l'envoi de l'e-mail au fournisseur." };
  }

  await prisma.purchaseOrder.updateMany({
    where: { id: poId, orgId },
    data: { status: "SENT", sentAt: new Date() },
  });

  revalidatePath("/purchase-orders");
  revalidatePath(`/purchase-orders/${poId}`);
  return { success: true };
}

export async function setPoStatus(
  poId: string,
  status: "SENT" | "CONFIRMED" | "RECEIVED" | "CANCELLED",
) {
  const { orgId } = await getOrgContext();
  const result = await prisma.purchaseOrder.updateMany({
    where: { id: poId, orgId },
    data: { status },
  });
  if (result.count === 0) return { error: "Bon de commande introuvable." };

  revalidatePath("/purchase-orders");
  revalidatePath(`/purchase-orders/${poId}`);
  return { success: true };
}

// ──────────────────────────── Réceptions & Factures ────────────────────────────

export async function createReceipt(
  poId: string,
  reference: string,
  date: Date,
  items: { productId: string; quantity: number }[],
  notes?: string,
  fileUrl?: string
) {
  const { orgId } = await getOrgContext();

  const po = await prisma.purchaseOrder.findFirst({
    where: { id: poId, orgId },
    include: { items: true, receipts: { include: { items: true } } },
  });
  if (!po) return { error: "Bon de commande introuvable." };

  await prisma.$transaction(async (tx) => {
    // 1. Créer le Bon de Réception
    await tx.receipt.create({
      data: {
        orgId,
        poId,
        reference,
        date,
        notes,
        fileUrl,
        items: {
          create: items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
          })),
        },
      },
    });

    // 2. Calculer les totaux reçus par produit pour mettre à jour le statut du PO
    const receivedSoFar = new Map<string, number>();
    for (const r of po.receipts) {
      for (const ri of r.items) {
        receivedSoFar.set(ri.productId, (receivedSoFar.get(ri.productId) ?? 0) + ri.quantity);
      }
    }
    for (const item of items) {
      receivedSoFar.set(item.productId, (receivedSoFar.get(item.productId) ?? 0) + item.quantity);
    }

    let allFullyReceived = true;
    for (const poItem of po.items) {
      const receivedQty = receivedSoFar.get(poItem.productId) ?? 0;
      if (receivedQty < poItem.quantity) {
        allFullyReceived = false;
        break;
      }
    }

    await tx.purchaseOrder.update({
      where: { id: poId },
      data: {
        status: allFullyReceived ? "RECEIVED" : "PARTIALLY_RECEIVED",
      },
    });
  });

  revalidatePath("/purchase-orders");
  revalidatePath(`/purchase-orders/${poId}`);
  return { success: true };
}

export async function createInvoice(
  poId: string,
  reference: string,
  date: Date,
  dueDate: Date | null,
  amountHT: number,
  tvaRate: number,
  amountTTC: number,
  items: { productId: string; quantity: number; unitPrice: number }[],
  notes?: string,
  fileUrl?: string
) {
  const { orgId } = await getOrgContext();

  const po = await prisma.purchaseOrder.findFirst({
    where: { id: poId, orgId },
  });
  if (!po) return { error: "Bon de commande introuvable." };

  await prisma.$transaction(async (tx) => {
    // 1. Créer la facture
    await tx.invoice.create({
      data: {
        orgId,
        poId,
        reference,
        date,
        dueDate,
        amountHT,
        tvaRate,
        amountTTC,
        status: "DRAFT",
        notes,
        fileUrl,
        items: {
          create: items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
          })),
        },
      },
    });

    // 2. Mettre à jour le PO status
    await tx.purchaseOrder.update({
      where: { id: poId },
      data: { status: "INVOICED" },
    });
  });

  revalidatePath("/purchase-orders");
  revalidatePath(`/purchase-orders/${poId}`);
  return { success: true };
}

export async function uploadProofFile(formData: FormData) {
  const { orgId } = await getOrgContext();
  const file = formData.get("file") as File;
  if (!file) return { error: "Aucun fichier sélectionné." };

  const saved = await saveFile(orgId, file);
  if ("error" in saved) return { error: saved.error };

  return { success: true, fileUrl: `/files/${saved.id}` };
}

export async function uploadPoConfirmation(poId: string, fileUrl: string) {
  const { orgId } = await getOrgContext();
  const po = await prisma.purchaseOrder.updateMany({
    where: { id: poId, orgId },
    data: { confirmationFile: fileUrl, status: "CONFIRMED" },
  });

  if (po.count === 0) return { error: "Bon de commande introuvable." };

  revalidatePath("/purchase-orders");
  revalidatePath(`/purchase-orders/${poId}`);
  return { success: true };
}

export async function createPayment(
  invoiceId: string,
  amount: number,
  date: Date,
  method: "VIREMENT" | "CHEQUE" | "ESPECES" | "CARTE" | "TRAITE" | "AUTRE",
  reference?: string,
  notes?: string,
  fileUrl?: string
) {
  const { orgId } = await getOrgContext();

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, orgId },
    include: { payments: true },
  });

  if (!invoice) return { error: "Facture introuvable." };

  await prisma.$transaction(async (tx) => {
    // 1. Create payment
    await tx.payment.create({
      data: {
        orgId,
        invoiceId,
        amount,
        date,
        method,
        reference,
        notes,
        fileUrl,
      },
    });

    // 2. Calculate total paid
    const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0) + amount;
    
    // 3. Update invoice status
    // Use a small epsilon (0.01) to account for floating point inaccuracies
    const isFullyPaid = totalPaid >= invoice.amountTTC - 0.01;
    
    await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        status: isFullyPaid ? "PAID" : "PARTIALLY_PAID",
      },
    });
  });

  revalidatePath("/purchase-orders");
  revalidatePath(`/purchase-orders/${invoice.poId}`);
  return { success: true };
}
