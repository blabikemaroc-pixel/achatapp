"use server";

import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";

import { getOrgContext } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { rfqEmailTemplate, sendMail } from "@/lib/email";
import { rfqSchema, type RfqInput } from "@/lib/validators";

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
