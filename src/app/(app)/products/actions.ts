"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";

import { getOrgContext } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { productSchema, type ProductInput } from "@/lib/validators";

function revalidate() {
  revalidatePath("/products");
  revalidatePath("/dashboard");
}

function normalize(input: ProductInput) {
  const categoryId =
    input.categoryId && input.categoryId !== "none" ? input.categoryId : null;
  return {
    name: input.name,
    reference: input.reference?.trim() ? input.reference.trim() : null,
    unit: input.unit,
    defaultQty: input.defaultQty ?? null,
    description: input.description?.trim() ? input.description.trim() : null,
    categoryId,
  };
}

async function assertCategory(categoryId: string | null, orgId: string) {
  if (!categoryId) return true;
  const cat = await prisma.category.findFirst({
    where: { id: categoryId, orgId },
    select: { id: true },
  });
  return !!cat;
}

export async function createProduct(input: ProductInput) {
  const { orgId } = await getOrgContext();
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return { error: "Champs invalides." };

  const data = normalize(parsed.data);
  if (!(await assertCategory(data.categoryId, orgId))) {
    return { error: "Catégorie invalide." };
  }

  await prisma.product.create({ data: { orgId, ...data } });
  revalidate();
  return { success: true };
}

export async function updateProduct(id: string, input: ProductInput) {
  const { orgId } = await getOrgContext();
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return { error: "Champs invalides." };

  const data = normalize(parsed.data);
  if (!(await assertCategory(data.categoryId, orgId))) {
    return { error: "Catégorie invalide." };
  }

  const result = await prisma.product.updateMany({
    where: { id, orgId },
    data,
  });
  if (result.count === 0) return { error: "Produit introuvable." };
  revalidate();
  return { success: true };
}

export async function deleteProduct(id: string) {
  const { orgId } = await getOrgContext();
  try {
    const result = await prisma.product.deleteMany({ where: { id, orgId } });
    if (result.count === 0) return { error: "Produit introuvable." };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      return {
        error:
          "Ce produit est utilisé (demande de prix ou commande) et ne peut pas être supprimé.",
      };
    }
    throw error;
  }
  revalidate();
  return { success: true };
}
