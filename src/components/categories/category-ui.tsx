"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  createCategory,
  deleteCategory,
  updateCategory,
} from "@/app/(app)/categories/actions";
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
import { categorySchema, type CategoryInput } from "@/lib/validators";

type Category = { id: string; name: string };

function CategoryFormDialog({
  open,
  onOpenChange,
  category,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: Category;
}) {
  const editing = !!category;
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CategoryInput>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: category?.name ?? "" },
  });

  useEffect(() => {
    if (open) reset({ name: category?.name ?? "" });
  }, [open, category, reset]);

  const onSubmit = (values: CategoryInput) => {
    startTransition(async () => {
      const res = category
        ? await updateCategory(category.id, values)
        : await createCategory(values);
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      toast.success(editing ? "Catégorie modifiée." : "Catégorie créée.");
      onOpenChange(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Modifier la catégorie" : "Nouvelle catégorie"}
          </DialogTitle>
          <DialogDescription>
            {editing
              ? "Renommez cette catégorie."
              : "Ajoutez une catégorie pour classer vos produits."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="cat-name">Nom</Label>
            <Input
              id="cat-name"
              autoFocus
              placeholder="Ex. Alimentaire"
              aria-invalid={!!errors.name}
              {...register("name")}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
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

export function NewCategoryButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Nouvelle catégorie
      </Button>
      <CategoryFormDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

export function CategoryRowActions({ category }: { category: Category }) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const onDelete = () => {
    startTransition(async () => {
      const res = await deleteCategory(category.id);
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Catégorie supprimée.");
      setDeleteOpen(false);
    });
  };

  return (
    <div className="flex justify-end gap-1">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Modifier ${category.name}`}
        onClick={() => setEditOpen(true)}
      >
        <Pencil className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Supprimer ${category.name}`}
        className="text-muted-foreground hover:text-destructive"
        onClick={() => setDeleteOpen(true)}
      >
        <Trash2 className="size-4" />
      </Button>

      <CategoryFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        category={category}
      />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Supprimer la catégorie ?</DialogTitle>
            <DialogDescription>
              « {category.name} » sera supprimée. Les produits associés
              deviendront « sans catégorie ». Cette action est irréversible.
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
