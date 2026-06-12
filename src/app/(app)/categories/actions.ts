"use server";

import { revalidatePath } from "next/cache";

import { getOrgContext } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { categorySchema, type CategoryInput } from "@/lib/validators";

function revalidate() {
  revalidatePath("/categories");
  revalidatePath("/products");
  revalidatePath("/dashboard");
}

export async function createCategory(input: CategoryInput) {
  const { orgId } = await getOrgContext();
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) return { error: "Champs invalides." };

  await prisma.category.create({ data: { orgId, name: parsed.data.name } });
  revalidate();
  return { success: true };
}

export async function updateCategory(id: string, input: CategoryInput) {
  const { orgId } = await getOrgContext();
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) return { error: "Champs invalides." };

  // updateMany + filtre orgId = impossible de toucher la catégorie d'une autre org
  const result = await prisma.category.updateMany({
    where: { id, orgId },
    data: { name: parsed.data.name },
  });
  if (result.count === 0) return { error: "Catégorie introuvable." };
  revalidate();
  return { success: true };
}

export async function deleteCategory(id: string) {
  const { orgId } = await getOrgContext();
  // onDelete: SetNull → les produits liés passent "sans catégorie".
  const result = await prisma.category.deleteMany({ where: { id, orgId } });
  if (result.count === 0) return { error: "Catégorie introuvable." };
  revalidate();
  return { success: true };
}
