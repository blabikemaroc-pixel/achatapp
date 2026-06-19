"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

import { getOrgContext } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { saveFile, deleteFile } from "@/lib/files";

export async function updateOrganizationSettings(formData: FormData) {
  const { orgId } = await getOrgContext();

  const name = formData.get("name") as string;
  const address = formData.get("address") as string | null;
  const city = formData.get("city") as string | null;
  const phone = formData.get("phone") as string | null;
  const email = formData.get("email") as string | null;
  const ice = formData.get("ice") as string | null;
  const rc = formData.get("rc") as string | null;
  const ifTax = formData.get("if") as string | null;
  const tp = formData.get("tp") as string | null;

  if (!name || name.trim() === "") {
    return { error: "Le nom de l'organisation est requis." };
  }

  // Logo : enregistré en base (StoredFile). `logo` contient l'id du fichier.
  const logoFile = formData.get("logo") as File | null;
  let logoId: string | undefined = undefined;

  if (logoFile && logoFile.size > 0) {
    const saved = await saveFile(orgId, logoFile, { imagesOnly: true });
    if ("error" in saved) return { error: saved.error };
    logoId = saved.id;
  }

  // Si on remplace le logo, on supprime l'ancien fichier.
  if (logoId) {
    const prev = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { logo: true },
    });
    if (prev?.logo) await deleteFile(orgId, prev.logo);
  }

  // Update in DB
  await prisma.organization.update({
    where: { id: orgId },
    data: {
      name,
      address: address || null,
      city: city || null,
      phone: phone || null,
      email: email || null,
      ice: ice || null,
      rc: rc || null,
      if: ifTax || null,
      tp: tp || null,
      ...(logoId ? { logo: logoId } : {}),
    },
  });

  revalidatePath("/settings");
  revalidatePath("/suppliers");
  revalidatePath("/dashboard");

  return { success: true };
}

export async function deleteOrganizationLogo() {
  const { orgId } = await getOrgContext();

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { logo: true },
  });
  if (org?.logo) await deleteFile(orgId, org.logo);

  await prisma.organization.update({
    where: { id: orgId },
    data: { logo: null },
  });

  revalidatePath("/settings");
  return { success: true };
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
) {
  const { userId } = await getOrgContext();

  if (!newPassword || newPassword.length < 8) {
    return { error: "Le nouveau mot de passe doit contenir au moins 8 caractères." };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });
  if (!user?.passwordHash) {
    return { error: "Utilisateur introuvable." };
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    return { error: "Le mot de passe actuel est incorrect." };
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash, failedLoginAttempts: 0, lockedUntil: null },
  });

  return { success: true };
}
