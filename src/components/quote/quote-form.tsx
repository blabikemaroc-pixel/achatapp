"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { APP_CURRENCY } from "@/lib/config";
import { formatCurrency } from "@/lib/format";
import type { QuoteInput } from "@/lib/validators";

export type QuoteFormItem = {
  productId: string;
  name: string;
  unit: string;
  requestedQty: number;
};

export type QuoteInitial = {
  deliveryDays: number | null;
  paymentTerms: string | null;
  shippingCost: number | null;
  validUntil: string | null;
  notes: string | null;
  prices: Record<string, string>;
  minQtys: Record<string, string>;
};

export function QuoteForm({
  items,
  initial,
  onSubmit,
  onSuccess,
  submitLabel = "Envoyer le devis",
}: {
  items: QuoteFormItem[];
  initial?: QuoteInitial;
  onSubmit: (
    input: QuoteInput,
  ) => Promise<{ error?: string; success?: boolean }>;
  onSuccess?: () => void;
  submitLabel?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [prices, setPrices] = useState<Record<string, string>>(
    initial?.prices ?? {},
  );
  const [minQtys, setMinQtys] = useState<Record<string, string>>(
    initial?.minQtys ?? {},
  );
  const [deliveryDays, setDeliveryDays] = useState(
    initial?.deliveryDays != null ? String(initial.deliveryDays) : "",
  );
  const [paymentTerms, setPaymentTerms] = useState(initial?.paymentTerms ?? "");
  const [shippingCost, setShippingCost] = useState(
    initial?.shippingCost != null ? String(initial.shippingCost) : "",
  );
  const [validUntil, setValidUntil] = useState(initial?.validUntil ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");

  const total =
    items.reduce((sum, it) => {
      const price = Number(prices[it.productId]);
      return sum + (Number.isFinite(price) ? price * it.requestedQty : 0);
    }, 0) + (Number(shippingCost) || 0);

  const submit = () => {
    const builtItems = items
      .map((it) => ({
        productId: it.productId,
        unitPrice: Number(prices[it.productId]),
        minQty: minQtys[it.productId] ? Number(minQtys[it.productId]) : undefined,
      }))
      .filter((i) => Number.isFinite(i.unitPrice) && i.unitPrice > 0);

    if (builtItems.length !== items.length) {
      toast.error("Indiquez un prix unitaire valide pour chaque produit.");
      return;
    }

    startTransition(async () => {
      const res = await onSubmit({
        deliveryDays: deliveryDays === "" ? undefined : Number(deliveryDays),
        paymentTerms,
        shippingCost: shippingCost === "" ? undefined : Number(shippingCost),
        validUntil: validUntil || undefined,
        notes,
        items: builtItems,
      });
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Devis enregistré.");
      onSuccess?.();
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {items.map((it) => (
          <div
            key={it.productId}
            className="space-y-2 rounded-lg border border-border p-3"
          >
            <div>
              <p className="text-sm font-medium">{it.name}</p>
              <p className="text-xs text-muted-foreground">
                Quantité demandée : {it.requestedQty} {it.unit}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor={`price-${it.productId}`}>
                  Prix unitaire ({APP_CURRENCY})
                </Label>
                <Input
                  id={`price-${it.productId}`}
                  inputMode="decimal"
                  placeholder="0.00"
                  className="text-right tabular-nums"
                  value={prices[it.productId] ?? ""}
                  onChange={(e) =>
                    setPrices((p) => ({ ...p, [it.productId]: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`minqty-${it.productId}`}>
                  Qté minimale (option.)
                </Label>
                <Input
                  id={`minqty-${it.productId}`}
                  inputMode="decimal"
                  className="text-right tabular-nums"
                  value={minQtys[it.productId] ?? ""}
                  onChange={(e) =>
                    setMinQtys((m) => ({
                      ...m,
                      [it.productId]: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="q-delivery">Délai de livraison (jours)</Label>
          <Input
            id="q-delivery"
            inputMode="numeric"
            value={deliveryDays}
            onChange={(e) => setDeliveryDays(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="q-shipping">Frais de port ({APP_CURRENCY})</Label>
          <Input
            id="q-shipping"
            inputMode="decimal"
            value={shippingCost}
            onChange={(e) => setShippingCost(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="q-terms">Conditions de paiement</Label>
          <Input
            id="q-terms"
            placeholder="Ex. 30 jours"
            value={paymentTerms}
            onChange={(e) => setPaymentTerms(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="q-valid">Devis valable jusqu&apos;au</Label>
          <Input
            id="q-valid"
            type="date"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="q-notes">Note (optionnel)</Label>
        <Textarea
          id="q-notes"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <div className="flex items-center justify-between border-t border-border pt-3 text-sm">
        <span className="text-muted-foreground">Total estimé</span>
        <span className="text-base font-semibold tabular-nums">
          {formatCurrency(total)}
        </span>
      </div>

      <Button onClick={submit} disabled={pending} className="w-full">
        {pending && <Loader2 className="size-4 animate-spin" />}
        {submitLabel}
      </Button>
    </div>
  );
}
