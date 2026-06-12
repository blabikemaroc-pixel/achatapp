import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import type { Role } from "@prisma/client";

import { prisma } from "@/lib/db";
import { LOGIN_LOCK_MINUTES, LOGIN_MAX_ATTEMPTS } from "@/lib/config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  // Le client reste connecté ~30 jours (connexion facile, peu de reconnexions).
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      authorize: async (credentials) => {
        const email = String(credentials?.email ?? "")
          .toLowerCase()
          .trim();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({
          where: { email },
          include: { memberships: { include: { org: true }, take: 1 } },
        });
        if (!user?.passwordHash) return null;

        // Anti-bruteforce : compte temporairement verrouillé après trop d'échecs.
        if (user.lockedUntil && user.lockedUntil > new Date()) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
          const attempts = user.failedLoginAttempts + 1;
          await prisma.user.update({
            where: { id: user.id },
            data:
              attempts >= LOGIN_MAX_ATTEMPTS
                ? {
                    failedLoginAttempts: 0,
                    lockedUntil: new Date(
                      Date.now() + LOGIN_LOCK_MINUTES * 60_000,
                    ),
                  }
                : { failedLoginAttempts: attempts },
          });
          return null;
        }

        const membership = user.memberships[0];
        if (!membership) return null;

        // Connexion réussie → on remet les compteurs à zéro.
        if (user.failedLoginAttempts > 0 || user.lockedUntil) {
          await prisma.user.update({
            where: { id: user.id },
            data: { failedLoginAttempts: 0, lockedUntil: null },
          });
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          orgId: membership.orgId,
          orgName: membership.org.name,
          role: membership.role,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.orgId = user.orgId;
        token.orgName = user.orgName;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.orgId = token.orgId as string;
        session.user.orgName = token.orgName as string;
        session.user.role = token.role as Role;
      }
      return session;
    },
  },
});
