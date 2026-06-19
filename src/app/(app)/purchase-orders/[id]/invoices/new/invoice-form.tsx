"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createInvoice, uploadProofFile } from "@/app/(app)/purchase-orders/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function InvoiceForm({ po }: { po: any }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [reference, setReference] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState("");
  const [tvaRate, setTvaRate] = useState(20);
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);

  // Map of productId -> { quantity, unitPrice }
  const [invoiceItems, setInvoiceItems] = useState<Record<string, { quantity: string; unitPrice: string }>>(() => {
    const initial: Record<string, { quantity: string; unitPrice: string }> = {};
    for (const item of po.items) {
      initial[item.productId] = {
        quantity: item.quantity.toString(),
        unitPrice: item.unitPrice.toString(),
      };
    }
    return initial;
  });

  const totalHT = po.items.reduce((sum: number, it: any) => {
    const data = invoiceItems[it.productId];
    const q = parseFloat(data?.quantity || "0");
    const p = parseFloat(data?.unitPrice || "0");
    return sum + (q * p);
  }, 0);

  const tvaAmount = totalHT * (tvaRate / 100);
  const totalTTC = totalHT + tvaAmount;

  const submit = () => {
    if (!reference) {
      toast.error("Veuillez saisir le numéro de la facture.");
      return;
    }

    const itemsToInvoice = po.items
      .map((it: any) => {
        const data = invoiceItems[it.productId];
        return {
          productId: it.productId,
          quantity: parseFloat(data?.quantity || "0"),
          unitPrice: parseFloat(data?.unitPrice || "0"),
        };
      })
      .filter((i: any) => i.quantity > 0);

    if (itemsToInvoice.length === 0) {
      toast.error("La facture doit contenir au moins un produit.");
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

      const res = await createInvoice(
        po.id,
        reference,
        new Date(date),
        dueDate ? new Date(dueDate) : null,
        totalHT,
        tvaRate,
        totalTTC,
        itemsToInvoice,
        notes,
        fileUrl
      );
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Facture enregistrée avec succès.");
      router.push(`/purchase-orders/${po.id}`);
    });
  };

  return (
    <div className="space-y-8 rounded-xl border border-border bg-card p-6">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label>Numéro de Facture *</Label>
          <Input
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="Ex: FA-2026-001"
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Date de facturation *</Label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Date d'échéance</Label>
          <Input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Facture scannée (PDF/Image)</Label>
        <Input 
          type="file" 
          accept="application/pdf,image/*" 
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground">Détails facturés</h3>
        <div className="rounded-lg border border-border bg-slate-50 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 border-b border-border text-left">
              <tr>
                <th className="p-3 font-medium">Produit</th>
                <th className="p-3 font-medium text-right w-32">Qté facturée</th>
                <th className="p-3 font-medium text-right w-32">P.U HT (MAD)</th>
                <th className="p-3 font-medium text-right w-32">Total HT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {po.items.map((item: any) => {
                const data = invoiceItems[item.productId];
                const q = parseFloat(data?.quantity || "0");
                const p = parseFloat(data?.unitPrice || "0");
                const lineTotal = isNaN(q) || isNaN(p) ? 0 : q * p;

                return (
                  <tr key={item.id} className="hover:bg-slate-100/50">
                    <td className="p-3 font-medium">
                      {item.product.name}
                      <span className="block text-xs font-normal text-muted-foreground mt-1">
                        Cmd: {item.quantity} {item.product.unit} au P.U de {item.unitPrice}
                      </span>
                    </td>
                    <td className="p-3">
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        value={data?.quantity}
                        onChange={(e) => setInvoiceItems((prev) => ({
                          ...prev,
                          [item.productId]: { ...prev[item.productId], quantity: e.target.value }
                        }))}
                        className="text-right h-8"
                      />
                    </td>
                    <td className="p-3">
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        value={data?.unitPrice}
                        onChange={(e) => setInvoiceItems((prev) => ({
                          ...prev,
                          [item.productId]: { ...prev[item.productId], unitPrice: e.target.value }
                        }))}
                        className="text-right h-8"
                      />
                    </td>
                    <td className="p-3 text-right font-semibold tabular-nums">
                      {lineTotal.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-2">
          <Label>Notes et commentaires</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex: Acompte de 30% déjà versé..."
            className="min-h-[120px]"
          />
        </div>

        <div className="rounded-xl bg-slate-50 border border-border p-6 space-y-4">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Total HT</span>
            <span className="font-medium tabular-nums">{totalHT.toFixed(2)} MAD</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">
              TVA (%)
              <Input
                type="number"
                min="0"
                max="100"
                value={tvaRate}
                onChange={(e) => setTvaRate(parseFloat(e.target.value) || 0)}
                className="w-16 h-7 ml-2 inline-block text-right"
              />
            </span>
            <span className="font-medium tabular-nums">{tvaAmount.toFixed(2)} MAD</span>
          </div>
          <div className="pt-4 border-t border-border flex justify-between items-center">
            <span className="font-semibold text-base">Net à Payer (TTC)</span>
            <span className="font-bold text-xl text-blue-700 tabular-nums">{totalTTC.toFixed(2)} MAD</span>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-border">
        <Button onClick={submit} disabled={pending} className="px-8">
          {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
          Valider la facture
        </Button>
      </div>
    </div>
  );
}
