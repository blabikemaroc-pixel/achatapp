"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";

import { getOrgContext } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { supplierSchema, type SupplierInput } from "@/lib/validators";

function revalidate() {
  revalidatePath("/suppliers");
  revalidatePath("/dashboard");
}

function clean(value?: string) {
  return value && value.trim() ? value.trim() : null;
}

function normalize(input: SupplierInput) {
  return {
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    contactName: clean(input.contactName),
    phone: clean(input.phone),
    address: clean(input.address),
    paymentTerms: clean(input.paymentTerms),
    notes: clean(input.notes),
    ice: clean(input.ice),
    rc: clean(input.rc),
    if: clean(input.if),
    tp: clean(input.tp),
  };
}

export async function createSupplier(input: SupplierInput) {
  const { orgId } = await getOrgContext();
  const parsed = supplierSchema.safeParse(input);
  if (!parsed.success) return { error: "Champs invalides." };

  await prisma.supplier.create({ data: { orgId, ...normalize(parsed.data) } });
  revalidate();
  return { success: true };
}

export async function updateSupplier(id: string, input: SupplierInput) {
  const { orgId } = await getOrgContext();
  const parsed = supplierSchema.safeParse(input);
  if (!parsed.success) return { error: "Champs invalides." };

  const result = await prisma.supplier.updateMany({
    where: { id, orgId },
    data: normalize(parsed.data),
  });
  if (result.count === 0) return { error: "Fournisseur introuvable." };
  revalidate();
  return { success: true };
}

export async function deleteSupplier(id: string) {
  const { orgId } = await getOrgContext();
  try {
    const result = await prisma.supplier.deleteMany({ where: { id, orgId } });
    if (result.count === 0) return { error: "Fournisseur introuvable." };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      return {
        error:
          "Ce fournisseur est utilisé (commande passée) et ne peut pas être supprimé.",
      };
    }
    throw error;
  }
  revalidate();
  return { success: true };
}

// Définit la liste des produits qu'un fournisseur peut fournir.
export async function setSupplierProducts(
  supplierId: string,
  productIds: string[],
) {
  const { orgId } = await getOrgContext();

  const supplier = await prisma.supplier.findFirst({
    where: { id: supplierId, orgId },
    select: { id: true },
  });
  if (!supplier) return { error: "Fournisseur introuvable." };

  // on ne garde que les produits qui appartiennent réellement à l'org
  const valid = await prisma.product.findMany({
    where: { orgId, id: { in: productIds } },
    select: { id: true },
  });

  const ops: Prisma.PrismaPromise<unknown>[] = [
    prisma.supplierProduct.deleteMany({ where: { supplierId } }),
  ];
  if (valid.length > 0) {
    ops.push(
      prisma.supplierProduct.createMany({
        data: valid.map((p) => ({ supplierId, productId: p.id })),
        skipDuplicates: true,
      }),
    );
  }
  await prisma.$transaction(ops);

  revalidate();
  return { success: true };
}
