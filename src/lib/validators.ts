import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("Adresse e-mail invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const categorySchema = z.object({
  name: z.string().trim().min(1, "Nom requis").max(80, "80 caractères maximum"),
});
export type CategoryInput = z.infer<typeof categorySchema>;

export const productSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nom requis")
    .max(120, "120 caractères maximum"),
  reference: z.string().trim().max(60, "60 caractères maximum").optional(),
  unit: z
    .string()
    .trim()
    .min(1, "Unité requise")
    .max(30, "30 caractères maximum"),
  defaultQty: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.coerce.number().positive("Quantité invalide").optional(),
  ),
  description: z.string().trim().max(500, "500 caractères maximum").optional(),
  categoryId: z.string().optional(),
});
export type ProductInput = z.infer<typeof productSchema>;

// Schéma côté formulaire : tous les champs sont des chaînes (valeurs d'inputs).
export const productFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nom requis")
    .max(120, "120 caractères maximum"),
  reference: z.string().trim().max(60, "60 caractères maximum"),
  unit: z
    .string()
    .trim()
    .min(1, "Unité requise")
    .max(30, "30 caractères maximum"),
  defaultQty: z
    .string()
    .trim()
    .refine(
      (v) => v === "" || (Number.isFinite(Number(v)) && Number(v) > 0),
      "Quantité invalide",
    ),
  description: z.string().trim().max(500, "500 caractères maximum"),
  categoryId: z.string(),
});
export type ProductFormValues = z.infer<typeof productFormSchema>;
