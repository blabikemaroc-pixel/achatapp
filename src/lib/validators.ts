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

export const supplierSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nom requis")
    .max(120, "120 caractères maximum"),
  contactName: z.string().trim().max(120, "120 caractères maximum").optional(),
  email: z.email("Adresse e-mail invalide").max(160, "160 caractères maximum"),
  phone: z.string().trim().max(40, "40 caractères maximum").optional(),
  address: z.string().trim().max(300, "300 caractères maximum").optional(),
  paymentTerms: z.string().trim().max(120, "120 caractères maximum").optional(),
  notes: z.string().trim().max(1000, "1000 caractères maximum").optional(),
  ice: z.string().trim().max(50, "50 caractères maximum").optional(),
  rc: z.string().trim().max(50, "50 caractères maximum").optional(),
  if: z.string().trim().max(50, "50 caractères maximum").optional(),
  tp: z.string().trim().max(50, "50 caractères maximum").optional(),
});
export type SupplierInput = z.infer<typeof supplierSchema>;

export const rfqSchema = z.object({
  title: z.string().trim().max(120, "120 caractères maximum").optional(),
  notes: z.string().trim().max(1000, "1000 caractères maximum").optional(),
  dueDate: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.coerce.number().positive("Quantité invalide"),
      }),
    )
    .min(1, "Sélectionnez au moins un produit"),
  supplierIds: z
    .array(z.string().min(1))
    .min(1, "Sélectionnez au moins un fournisseur"),
});
export type RfqInput = z.infer<typeof rfqSchema>;

export const quoteSchema = z.object({
  deliveryDays: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.coerce.number().int().min(0, "Délai invalide").optional(),
  ),
  paymentTerms: z.string().trim().max(120, "120 caractères maximum").optional(),
  shippingCost: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.coerce.number().min(0, "Montant invalide").optional(),
  ),
  validUntil: z.string().optional(),
  notes: z.string().trim().max(1000, "1000 caractères maximum").optional(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        unitPrice: z.coerce.number().positive("Prix invalide"),
        minQty: z.preprocess(
          (v) => (v === "" || v == null ? undefined : v),
          z.coerce.number().positive("Quantité invalide").optional(),
        ),
      }),
    )
    .min(1, "Indiquez au moins un prix"),
});
export type QuoteInput = z.infer<typeof quoteSchema>;
