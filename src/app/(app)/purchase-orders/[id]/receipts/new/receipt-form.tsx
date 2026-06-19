"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createReceipt, uploadProofFile } from "@/app/(app)/purchase-orders/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type ReceiptPoItem = {
  id: string;
  productId: string;
  quantity: number;
  product: { name: string; unit: string };
};
type ReceiptPo = {
  id: string;
  items: ReceiptPoItem[];
  receipts: { items: { productId: string; quantity: number }[] }[];
};

export function ReceiptForm({ po }: { po: ReceiptPo }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [reference, setReference] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);

  // Map of productId -> quantity to receive
  const [received, setReceived] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    const receivedSoFar = new Map<string, number>();
    for (const r of po.receipts) {
      for (const ri of r.items) {
        receivedSoFar.set(ri.productId, (receivedSoFar.get(ri.productId) ?? 0) + ri.quantity);
      }
    }
    for (const item of po.items) {
      const already = receivedSoFar.get(item.productId) ?? 0;
      const remaining = Math.max(0, item.quantity - already);
      initial[item.productId] = remaining.toString();
    }
    return initial;
  });

  const submit = () => {
    if (!reference) {
      toast.error("Veuillez saisir un numéro de BL.");
      return;
    }

    const itemsToReceive = po.items
      .map((it) => ({
        productId: it.productId,
        quantity: parseFloat(received[it.productId] || "0"),
      }))
      .filter((i) => i.quantity > 0);

    if (itemsToReceive.length === 0) {
      toast.error("Veuillez saisir au moins une quantité reçue.");
      return;
    }

    startTransition(async () => {
      let fileUrl: string | undefined = undefined;

      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        const uploadRes = await uploadProofFile(formData);
        if (uploadRes.error || !uploadRes.fileUrl) {
          toast.error(uploadRes.error || "Erreur lors de l'upload du fichier.");
          return;
        }
        fileUrl = uploadRes.fileUrl;
      }

      const res = await createReceipt(po.id, reference, new Date(date), itemsToReceive, notes, fileUrl);
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Bon de réception enregistré avec succès.");
      router.push(`/purchase-orders/${po.id}`);
    });
  };

  return (
    <div className="space-y-8 rounded-xl border border-border bg-card p-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Numéro de BL Fournisseur *</Label>
          <Input
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="Ex: BL-2026-001"
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Date de réception *</Label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Preuve documentaire (BL scanné)</Label>
        <Input 
          type="file" 
          accept="application/pdf,image/*" 
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground">Articles réceptionnés</h3>
        <div className="rounded-lg border border-border bg-slate-50 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 border-b border-border text-left">
              <tr>
                <th className="p-3 font-medium">Produit</th>
                <th className="p-3 font-medium text-right">Commandé</th>
                <th className="p-3 font-medium text-right">Déjà reçu</th>
                <th className="p-3 font-medium text-right w-40">Réception (Qté)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {po.items.map((item) => {
                let already = 0;
                for (const r of po.receipts) {
                  for (const ri of r.items) {
                    if (ri.productId === item.productId) already += ri.quantity;
                  }
                }
                const remaining = Math.max(0, item.quantity - already);

                return (
                  <tr key={item.id} className="hover:bg-slate-100/50">
                    <td className="p-3 font-medium">{item.product.name}</td>
                    <td className="p-3 text-right">{item.quantity} {item.product.unit}</td>
                    <td className="p-3 text-right">{already} {item.product.unit}</td>
                    <td className="p-3 text-right">
                      <Input
                        type="number"
                        min="0"
                        max={remaining.toString()}
                        step="any"
                        value={received[item.productId]}
                        onChange={(e) => setReceived((prev) => ({ ...prev, [item.productId]: e.target.value }))}
                        className="text-right h-8"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Notes additionnelles (Réserves, état des colis...)</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Ex: Palette endommagée, réserves émises..."
        />
      </div>

      <div className="flex justify-end pt-4 border-t border-border">
        <Button onClick={submit} disabled={pending} className="px-8">
          {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
          Valider la réception
        </Button>
      </div>
    </div>
  );
}
