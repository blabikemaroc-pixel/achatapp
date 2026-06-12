"use server";

import { AuthError } from "next-auth";

import { signIn, signOut } from "@/auth";
import { prisma } from "@/lib/db";
import { LOGIN_LOCK_MINUTES } from "@/lib/config";
import { loginSchema, type LoginInput } from "@/lib/validators";

export async function loginAction(input: LoginInput) {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return { error: "Champs invalides." };

  const email = parsed.data.email.toLowerCase().trim();

  // Message clair si le compte est verrouillé (anti-bruteforce).
  const user = await prisma.user.findUnique({
    where: { email },
    select: { lockedUntil: true },
  });
  if (user?.lockedUntil && user.lockedUntil > new Date()) {
    return {
      error: `Trop de tentatives. Réessayez dans ${LOGIN_LOCK_MINUTES} minutes.`,
    };
  }

  try {
    await signIn("credentials", {
      email,
      password: parsed.data.password,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "E-mail ou mot de passe incorrect." };
    }
    throw error; // laisse passer la redirection Next
  }
}

export async function logout() {
  await signOut({ redirectTo: "/login" });
}
