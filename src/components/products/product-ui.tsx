"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  createProduct,
  deleteProduct,
  updateProduct,
} from "@/app/(app)/products/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  productFormSchema,
  type ProductFormValues,
  type ProductInput,
} from "@/lib/validators";

export type CategoryOption = { id: string; name: string };
export type ProductRow = {
  id: string;
  name: string;
  reference: string | null;
  unit: string;
  defaultQty: number | null;
  description: string | null;
  categoryId: string | null;
};

const selectClass =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function toPayload(values: ProductFormValues): ProductInput {
  return {
    name: values.name,
    reference: values.reference,
    unit: values.unit,
    defaultQty:
      values.defaultQty === "" ? undefined : Number(values.defaultQty),
    description: values.description,
    categoryId: values.categoryId,
  };
}

function defaultsFor(product?: ProductRow): ProductFormValues {
  return {
    name: product?.name ?? "",
    reference: product?.reference ?? "",
    unit: product?.unit ?? "unité",
    defaultQty: product?.defaultQty != null ? String(product.defaultQty) : "",
    description: product?.description ?? "",
    categoryId: product?.categoryId ?? "none",
  };
}

function ProductFormDialog({
  open,
  onOpenChange,
  categories,
  product,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: CategoryOption[];
  product?: ProductRow;
}) {
  const editing = !!product;
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: defaultsFor(product),
  });

  useEffect(() => {
    if (open) reset(defaultsFor(product));
  }, [open, product, reset]);

  const onSubmit = (values: ProductFormValues) => {
    startTransition(async () => {
      const payload = toPayload(values);
      const res = product
        ? await updateProduct(product.id, payload)
        : await createProduct(payload);
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      toast.success(editing ? "Produit modifié." : "Produit créé.");
      onOpenChange(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Modifier le produit" : "Nouveau produit"}
          </DialogTitle>
          <DialogDescription>
            Renseignez les informations du produit.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="p-name">Nom</Label>
            <Input
              id="p-name"
              autoFocus
              placeholder="Ex. Huile d'olive 5L"
              aria-invalid={!!errors.name}
              {...register("name")}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="p-ref">Référence</Label>
              <Input
                id="p-ref"
                placeholder="Ex. ALM-001"
                aria-invalid={!!errors.reference}
                {...register("reference")}
              />
              {errors.reference && (
                <p className="text-sm text-destructive">
                  {errors.reference.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-cat">Catégorie</Label>
              <select
                id="p-cat"
                className={selectClass}
                {...register("categoryId")}
              >
                <option value="none">Sans catégorie</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="p-unit">Unité</Label>
              <Input
                id="p-unit"
                placeholder="Ex. carton, kg, pièce"
                aria-invalid={!!errors.unit}
                {...register("unit")}
              />
              {errors.unit && (
                <p className="text-sm text-destructive">{errors.unit.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-qty">Quantité par défaut</Label>
              <Input
                id="p-qty"
                inputMode="decimal"
                placeholder="Ex. 10"
                aria-invalid={!!errors.defaultQty}
                {...register("defaultQty")}
              />
              {errors.defaultQty && (
                <p className="text-sm text-destructive">
                  {errors.defaultQty.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="p-desc">Description</Label>
            <Textarea
              id="p-desc"
              rows={3}
              placeholder="Optionnel"
              aria-invalid={!!errors.description}
              {...register("description")}
            />
            {errors.description && (
              <p className="text-sm text-destructive">
                {errors.description.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              {editing ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function NewProductButton({
  categories,
}: {
  categories: CategoryOption[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Nouveau produit
      </Button>
      <ProductFormDialog
        open={open}
        onOpenChange={setOpen}
        categories={categories}
      />
    </>
  );
}

export function ProductRowActions({
  product,
  categories,
}: {
  product: ProductRow;
  categories: CategoryOption[];
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const onDelete = () => {
    startTransition(async () => {
      const res = await deleteProduct(product.id);
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Produit supprimé.");
      setDeleteOpen(false);
    });
  };

  return (
    <div className="flex justify-end gap-1">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Modifier ${product.name}`}
        onClick={() => setEditOpen(true)}
      >
        <Pencil className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Supprimer ${product.name}`}
        className="text-muted-foreground hover:text-destructive"
        onClick={() => setDeleteOpen(true)}
      >
        <Trash2 className="size-4" />
      </Button>

      <ProductFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        categories={categories}
        product={product}
      />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Supprimer le produit ?</DialogTitle>
            <DialogDescription>
              « {product.name} » sera définitivement supprimé.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={pending}
            >
              Annuler
            </Button>
            <Button variant="destructive" onClick={onDelete} disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
