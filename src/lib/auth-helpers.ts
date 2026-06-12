import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";

import { auth } from "@/auth";

/**
 * Contexte d'organisation pour les Server Components / Server Actions.
 * Redirige vers /login si l'utilisateur n'est pas connecté.
 * Toutes les requêtes Prisma doivent filtrer par le `orgId` renvoyé ici.
 */
export async function getOrgContext() {
  const session = await auth();
  const user = session?.user;
  if (!user?.orgId) redirect("/login");

  return {
    userId: user.id,
    orgId: user.orgId,
    orgName: user.orgName,
    role: user.role as Role,
    name: user.name ?? null,
    email: user.email ?? null,
  };
}
