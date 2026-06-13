"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";

import { createRfq } from "@/app/(app)/rfq/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type ProductItem = {
  id: string;
  name: string;
  unit: string;
  defaultQty: number | null;
  category: string | null;
};
type SupplierItem = {
  id: string;
  name: string;
  email: string;
  productIds: string[];
};

export function RfqBuilder({
  products,
  suppliers,
}: {
  products: ProductItem[];
  suppliers: SupplierItem[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const submittingRef = useRef(false);

  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [qtyByProduct, setQtyByProduct] = useState<Record<string, string>>({});
  const [selectedSuppliers, setSelectedSuppliers] = useState<Set<string>>(
    new Set(),
  );

  const selectedProductIds = useMemo(
    () => Object.keys(qtyByProduct),
    [qtyByProduct],
  );
  const selectedKey = useMemo(
    () => [...selectedProductIds].sort().join(","),
    [selectedProductIds],
  );

  const eligibleSuppliers = useMemo(
    () =>
      suppliers.filter((s) =>
        s.productIds.some((pid) => qtyByProduct[pid] !== undefined),
      ),
    [suppliers, qtyByProduct],
  );

  // À chaque changement de la liste de produits, présélectionner tous les
  // fournisseurs éligibles.
  useEffect(() => {
    setSelectedSuppliers(new Set(eligibleSuppliers.map((s) => s.id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKey]);

  const toggleProduct = (p: ProductItem) =>
    setQtyByProduct((prev) => {
      const next = { ...prev };
      if (p.id in next) delete next[p.id];
      else next[p.id] = p.defaultQty != null ? String(p.defaultQty) : "1";
      return next;
    });

  const setQty = (id: string, value: string) =>
    setQtyByProduct((prev) => ({ ...prev, [id]: value }));

  const toggleSupplier = (id: string) =>
    setSelectedSuppliers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const onSubmit = () => {
    const items = Object.entries(qtyByProduct)
      .map(([productId, q]) => ({ productId, quantity: Number(q) }))
      .filter((i) => Number.isFinite(i.quantity) && i.quantity > 0);

    if (items.length === 0) {
      toast.error("Sélectionnez au moins un produit avec une quantité valide.");
      return;
    }
    const supplierIds = [...selectedSuppliers];
    if (supplierIds.length === 0) {
      toast.error("Sélectionnez au moins un fournisseur.");
      return;
    }

    startTransition(async () => {
      // Garde anti double-envoi (double-clic + double-invocation Strict Mode).
      if (submittingRef.current) return;
      submittingRef.current = true;

      const res = await createRfq({
        title,
        notes,
        dueDate: dueDate || undefined,
        items,
        supplierIds,
      });
      if (res?.error) {
        submittingRef.current = false;
        toast.error(res.error);
        return;
      }
      toast.success("Demande de prix envoyée.");
      router.push(`/rfq/${res.id}`);
    });
  };

  if (products.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Ajoutez d&apos;abord des produits au catalogue pour créer une demande
          de prix.{" "}
          <Link href="/products" className="font-medium text-primary hover:underline">
            Aller aux produits
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Informations</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="rfq-title">Intitulé (optionnel)</Label>
            <Input
              id="rfq-title"
              placeholder="Ex. Réassort cuisine — juin"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rfq-due">Date limite de réponse (optionnel)</Label>
            <Input
              id="rfq-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="rfq-notes">Note pour les fournisseurs (optionnel)</Label>
            <Textarea
              id="rfq-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Produits ({selectedProductIds.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border">
            {products.map((p) => {
              const selected = p.id in qtyByProduct;
              return (
                <div key={p.id} className="flex items-center gap-3 py-2">
                  <Checkbox
                    id={`rfq-p-${p.id}`}
                    checked={selected}
                    onCheckedChange={() => toggleProduct(p)}
                  />
                  <label
                    htmlFor={`rfq-p-${p.id}`}
                    className="flex-1 cursor-pointer text-sm"
                  >
                    {p.name}
                    {p.category ? (
                      <span className="text-muted-foreground"> · {p.category}</span>
                    ) : null}
                  </label>
                  {selected ? (
                    <div className="flex items-center gap-2">
                      <Input
                        aria-label={`Quantité pour ${p.name}`}
                        inputMode="decimal"
                        className="h-8 w-24 text-right tabular-nums"
                        value={qtyByProduct[p.id]}
                        onChange={(e) => setQty(p.id, e.target.value)}
                      />
                      <span className="w-16 text-sm text-muted-foreground">
                        {p.unit}
                      </span>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fournisseurs à consulter ({selectedSuppliers.size})</CardTitle>
        </CardHeader>
        <CardContent>
          {selectedProductIds.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Sélectionnez d&apos;abord des produits.
            </p>
          ) : eligibleSuppliers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun fournisseur ne fournit ces produits. Associez des produits à
              vos fournisseurs depuis la page Fournisseurs.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {eligibleSuppliers.map((s) => (
                <div key={s.id} className="flex items-center gap-3 py-2">
                  <Checkbox
                    id={`rfq-s-${s.id}`}
                    checked={selectedSuppliers.has(s.id)}
                    onCheckedChange={() => toggleSupplier(s.id)}
                  />
                  <label
                    htmlFor={`rfq-s-${s.id}`}
                    className="flex-1 cursor-pointer text-sm"
                  >
                    {s.name}
                    <span className="text-muted-foreground"> · {s.email}</span>
                  </label>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Link href="/rfq" className={buttonVariants({ variant: "outline" })}>
          Annuler
        </Link>
        <Button onClick={onSubmit} disabled={pending}>
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
          Envoyer la demande
        </Button>
      </div>
    </div>
  );
}
