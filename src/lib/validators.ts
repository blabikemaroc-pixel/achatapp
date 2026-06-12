import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("Adresse e-mail invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});

export const registerSchema = z.object({
  name: z.string().min(1, "Votre nom est requis"),
  orgName: z.string().min(1, "Le nom de l'organisation est requis"),
  email: z.email("Adresse e-mail invalide"),
  password: z.string().min(8, "8 caractères minimum"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
