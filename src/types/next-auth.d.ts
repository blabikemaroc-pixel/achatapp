import type { DefaultSession } from "next-auth";
import type { Role } from "@prisma/client";

declare module "next-auth" {
  interface User {
    orgId?: string;
    orgName?: string;
    role?: Role;
  }

  interface Session {
    user: {
      id: string;
      orgId: string;
      orgName: string;
      role: Role;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    orgId?: string;
    orgName?: string;
    role?: Role;
  }
}
