"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ListChecks, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  createSupplier,
  deleteSupplier,
  setSupplierProducts,
  updateSupplier,
} from "@/app/(app)/suppliers/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { supplierSchema, type SupplierInput } from "@/lib/validators";

export type ProductOption = { id: string; name: string; category: string | null };
export type Supplier = {
  id: string;
  name: string;
  contactName: string | null;
  email: string;
  phone: string | null;
  address: string | null;
  paymentTerms: string | null;
  notes: string | null;
  ice: string | null;
  rc: string | null;
  if: string | null;
  tp: string | null;
};

function defaultsFor(supplier?: Supplier): SupplierInput {
  return {
    name: supplier?.name ?? "",
    contactName: supplier?.contactName ?? "",
    email: supplier?.email ?? "",
    phone: supplier?.phone ?? "",
    address: supplier?.address ?? "",
    paymentTerms: supplier?.paymentTerms ?? "",
    notes: supplier?.notes ?? "",
    ice: supplier?.ice ?? "",
    rc: supplier?.rc ?? "",
    if: supplier?.if ?? "",
    tp: supplier?.tp ?? "",
  };
}

function SupplierFormDialog({
  open,
  onOpenChange,
  supplier,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier?: Supplier;
}) {
  const editing = !!supplier;
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SupplierInput>({
    resolver: zodResolver(supplierSchema),
    defaultValues: defaultsFor(supplier),
  });

  useEffect(() => {
    if (open) reset(defaultsFor(supplier));
  }, [open, supplier, reset]);

  const onSubmit = (values: SupplierInput) => {
    startTransition(async () => {
      const res = supplier
        ? await updateSupplier(supplier.id, values)
        : await createSupplier(values);
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      toast.success(editing ? "Fournisseur modifié." : "Fournisseur créé.");
      onOpenChange(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Modifier le fournisseur" : "Nouveau fournisseur"}
          </DialogTitle>
          <DialogDescription>
            Coordonnées et conditions du fournisseur.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="s-name">Nom du fournisseur</Label>
            <Input
              id="s-name"
              autoFocus
              placeholder="Ex. Grossiste Atlas"
              aria-invalid={!!errors.name}
              {...register("name")}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="s-contact">Contact</Label>
              <Input
                id="s-contact"
                placeholder="Ex. M. Karim"
                {...register("contactName")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="s-phone">Téléphone</Label>
              <Input id="s-phone" type="tel" {...register("phone")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="s-email">E-mail</Label>
            <Input
              id="s-email"
              type="email"
              placeholder="contact@fournisseur.com"
              aria-invalid={!!errors.email}
              {...register("email")}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="s-address">Adresse</Label>
              <Input id="s-address" {...register("address")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="s-terms">Conditions de paiement</Label>
              <Input
                id="s-terms"
                placeholder="Ex. 30 jours"
                {...register("paymentTerms")}
              />
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <h4 className="text-sm font-medium text-muted-foreground">
              Identifiants légaux (Optionnel)
            </h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="s-ice">ICE</Label>
                <Input id="s-ice" {...register("ice")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="s-rc">RC</Label>
                <Input id="s-rc" {...register("rc")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="s-if">Identifiant Fiscal (IF)</Label>
                <Input id="s-if" {...register("if")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="s-tp">Taxe Professionnelle (TP)</Label>
                <Input id="s-tp" {...register("tp")} />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="s-notes">Notes</Label>
            <Textarea id="s-notes" rows={2} {...register("notes")} />
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

function SupplierProductsDialog({
  open,
  onOpenChange,
  supplier,
  products,
  selectedProductIds,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier: Supplier;
  products: ProductOption[];
  selectedProductIds: string[];
}) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(selectedProductIds),
  );
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      setSelected(new Set(selectedProductIds));
      setQuery("");
    }
  }, [open, selectedProductIds]);

  const filtered = products.filter((p) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      (p.category ?? "").toLowerCase().includes(q)
    );
  });

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const onSave = () => {
    startTransition(async () => {
      const res = await setSupplierProducts(supplier.id, [...selected]);
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Produits fournis mis à jour.");
      onOpenChange(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Produits fournis</DialogTitle>
          <DialogDescription>
            Cochez les produits que « {supplier.name} » peut fournir.
          </DialogDescription>
        </DialogHeader>

        {products.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun produit dans le catalogue. Ajoutez d&apos;abord des produits.
          </p>
        ) : (
          <div className="space-y-3">
            <Input
              placeholder="Rechercher un produit…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="max-h-72 space-y-0.5 overflow-y-auto rounded-lg border border-border p-1">
              {filtered.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted"
                >
                  <Checkbox
                    id={`sp-${p.id}`}
                    checked={selected.has(p.id)}
                    onCheckedChange={() => toggle(p.id)}
                  />
                  <label
                    htmlFor={`sp-${p.id}`}
                    className="flex-1 cursor-pointer text-sm"
                  >
                    {p.name}
                    {p.category ? (
                      <span className="text-muted-foreground"> · {p.category}</span>
                    ) : null}
                  </label>
                </div>
              ))}
              {filtered.length === 0 ? (
                <p className="px-2 py-2 text-sm text-muted-foreground">
                  Aucun résultat.
                </p>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">
              {selected.size} produit(s) sélectionné(s)
            </p>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Annuler
          </Button>
          <Button onClick={onSave} disabled={pending || products.length === 0}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function NewSupplierButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Nouveau fournisseur
      </Button>
      <SupplierFormDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

export function SupplierRowActions({
  supplier,
  products,
  selectedProductIds,
}: {
  supplier: Supplier;
  products: ProductOption[];
  selectedProductIds: string[];
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [productsOpen, setProductsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const onDelete = () => {
    startTransition(async () => {
      const res = await deleteSupplier(supplier.id);
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Fournisseur supprimé.");
      setDeleteOpen(false);
    });
  };

  return (
    <div className="flex justify-end gap-1">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Produits fournis par ${supplier.name}`}
        onClick={() => setProductsOpen(true)}
      >
        <ListChecks className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Modifier ${supplier.name}`}
        onClick={() => setEditOpen(true)}
      >
        <Pencil className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Supprimer ${supplier.name}`}
        className="text-muted-foreground hover:text-destructive"
        onClick={() => setDeleteOpen(true)}
      >
        <Trash2 className="size-4" />
      </Button>

      <SupplierFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        supplier={supplier}
      />
      <SupplierProductsDialog
        open={productsOpen}
        onOpenChange={setProductsOpen}
        supplier={supplier}
        products={products}
        selectedProductIds={selectedProductIds}
      />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Supprimer le fournisseur ?</DialogTitle>
            <DialogDescription>
              « {supplier.name} » sera supprimé, ainsi que ses associations
              produits. Cette action est irréversible.
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
