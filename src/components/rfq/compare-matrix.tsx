"use client";

import { useState, useTransition } from "react";
import { Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { awardSplitQuotes } from "@/app/(app)/rfq/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

type ColData = {
  quoteId: string;
  name: string;
  status: string;
  deliveryDays: number | null;
  paymentTerms: string | null;
  shippingCost: number;
  validUntil: Date | null;
  prices: Record<string, number>;
  total: number;
};

type ItemData = {
  id: string;
  productId: string;
  name: string;
  quantity: number;
  unit: string;
};

export function CompareMatrix({
  rfqId,
  items,
  cols,
  isClosed,
}: {
  rfqId: string;
  items: ItemData[];
  cols: ColData[];
  isClosed: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // state: productId -> quoteId
  const [selections, setSelections] = useState<Record<string, string>>(() => {
    // Par défaut, sélectionner le moins cher pour chaque ligne
    const initial: Record<string, string> = {};
    if (!isClosed) {
      for (const it of items) {
        let minPrice = Number.POSITIVE_INFINITY;
        let bestQuoteId = "";
        for (const c of cols) {
          const p = c.prices[it.productId];
          if (p != null && p < minPrice) {
            minPrice = p;
            bestQuoteId = c.quoteId;
          }
        }
        if (bestQuoteId) {
          initial[it.productId] = bestQuoteId;
        }
      }
    }
    return initial;
  });

  const minTotal = Math.min(...cols.map((c) => c.total));
  const minDelivery = Math.min(...cols.map((c) => c.deliveryDays ?? Number.POSITIVE_INFINITY));

  const handleSelect = (productId: string, quoteId: string) => {
    if (isClosed) return;
    setSelections((prev) => ({ ...prev, [productId]: quoteId }));
  };

  const submit = () => {
    const awards = Object.entries(selections).map(([productId, quoteId]) => ({
      productId,
      quoteId,
    }));

    if (awards.length === 0) {
      toast.error("Veuillez sélectionner au moins un produit à adjuger.");
      return;
    }

    startTransition(async () => {
      const res = await awardSplitQuotes(rfqId, awards);
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Adjudication validée et Bons de commande générés !");
      if (res.poIds && res.poIds.length === 1) {
        router.push(`/purchase-orders/${res.poIds[0]}`);
      } else {
        router.push("/purchase-orders");
      }
    });
  };

  const best = "bg-primary/10 font-semibold text-primary";

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-40 bg-slate-50">Produit</TableHead>
              {cols.map((c) => (
                <TableHead key={c.quoteId} className="min-w-40 text-center bg-slate-50 border-l border-border">
                  <div className="flex flex-col items-center gap-1">
                    <span className="font-semibold text-foreground text-base">{c.name}</span>
                    {c.status === "SELECTED" ? (
                      <Badge variant="default" className="bg-green-600">Gagnant</Badge>
                    ) : null}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((it) => {
              const minPrice = Math.min(...cols.map((c) => c.prices[it.productId] ?? Number.POSITIVE_INFINITY));

              return (
                <TableRow key={it.id} className="group hover:bg-slate-50/50">
                  <TableCell className="bg-slate-50/30">
                    <span className="font-medium">{it.name}</span>
                    <span className="block text-xs text-muted-foreground mt-1">
                      {formatNumber(it.quantity)} {it.unit}
                    </span>
                  </TableCell>
                  {cols.map((c) => {
                    const price = c.prices[it.productId];
                    const isBest = price != null && price === minPrice;
                    const isSelected = selections[it.productId] === c.quoteId;

                    return (
                      <TableCell
                        key={c.quoteId}
                        onClick={() => price != null && handleSelect(it.productId, c.quoteId)}
                        className={cn(
                          "text-center tabular-nums cursor-pointer transition-colors border-l border-border relative",
                          price == null ? "bg-gray-100/50" : "hover:bg-blue-50",
                          isSelected && !isClosed ? "bg-blue-100 ring-2 ring-inset ring-blue-500" : "",
                          c.status === "SELECTED" && price != null ? "bg-green-50" : "" // Highlight if already awarded in DB
                        )}
                      >
                        {isSelected && !isClosed && (
                          <div className="absolute top-1 right-1 text-blue-600">
                            <Check className="size-3" />
                          </div>
                        )}
                        <div className="flex flex-col items-center justify-center h-full">
                          <span className={cn(
                            "text-sm",
                            isBest && "font-bold text-green-700",
                            !isBest && price != null && "text-gray-700"
                          )}>
                            {price != null ? formatCurrency(price) : "—"}
                          </span>
                        </div>
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}

            <TableRow>
              <TableCell className="font-medium bg-slate-50/30">Frais de port</TableCell>
              {cols.map((c) => (
                <TableCell key={c.quoteId} className="text-center tabular-nums text-sm border-l border-border">
                  {formatCurrency(c.shippingCost)}
                </TableCell>
              ))}
            </TableRow>

            <TableRow className="border-t-2 border-border">
              <TableCell className="font-semibold bg-slate-50/30">Total Offre</TableCell>
              {cols.map((c) => (
                <TableCell
                  key={c.quoteId}
                  className={cn(
                    "text-center text-base tabular-nums border-l border-border",
                    c.total === minTotal ? best : "font-semibold",
                  )}
                >
                  {formatCurrency(c.total)}
                </TableCell>
              ))}
            </TableRow>

            <TableRow>
              <TableCell className="text-muted-foreground bg-slate-50/30">
                Délai de livraison
              </TableCell>
              {cols.map((c) => (
                <TableCell
                  key={c.quoteId}
                  className={cn(
                    "text-center tabular-nums text-sm border-l border-border",
                    c.deliveryDays != null && c.deliveryDays === minDelivery && best,
                  )}
                >
                  {c.deliveryDays != null ? `${c.deliveryDays} j` : "—"}
                </TableCell>
              ))}
            </TableRow>

            <TableRow>
              <TableCell className="text-muted-foreground bg-slate-50/30">
                Conditions de paiement
              </TableCell>
              {cols.map((c) => (
                <TableCell key={c.quoteId} className="text-center text-sm border-l border-border">
                  {c.paymentTerms ?? "—"}
                </TableCell>
              ))}
            </TableRow>

            <TableRow>
              <TableCell className="text-muted-foreground bg-slate-50/30">Validité</TableCell>
              {cols.map((c) => (
                <TableCell key={c.quoteId} className="text-center text-sm border-l border-border">
                  {formatDate(c.validUntil)}
                </TableCell>
              ))}
            </TableRow>
          </TableBody>
        </Table>
      </div>

      {!isClosed && (
        <div className="flex justify-end pt-4">
          <Button size="lg" onClick={submit} disabled={pending} className="px-8 shadow-md">
            {pending && <Loader2 className="mr-2 size-5 animate-spin" />}
            Valider l'adjudication & Générer les BC
          </Button>
        </div>
      )}
    </div>
  );
}
