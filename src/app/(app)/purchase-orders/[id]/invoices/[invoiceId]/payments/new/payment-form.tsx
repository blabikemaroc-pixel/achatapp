"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createPayment, uploadProofFile } from "@/app/(app)/purchase-orders/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/format";

type PaymentMethod = "VIREMENT" | "CHEQUE" | "ESPECES" | "CARTE" | "TRAITE" | "AUTRE";

export function PaymentForm({ invoice, poId, remaining }: { invoice: { id: string }; poId: string; remaining: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [amount, setAmount] = useState(remaining.toString());
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [method, setMethod] = useState<PaymentMethod>("VIREMENT");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const paymentAmount = parseFloat(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      toast.error("Veuillez saisir un montant valide.");
      return;
    }

    if (paymentAmount > remaining + 0.01) {
      toast.error(`Le montant ne peut pas dépasser le reste à payer (${formatCurrency(remaining)}).`);
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

      const res = await createPayment(
        invoice.id,
        paymentAmount,
        new Date(date),
        method,
        reference,
        notes,
        fileUrl
      );

      if (res?.error) {
        toast.error(res.error);
        return;
      }

      toast.success("Paiement enregistré avec succès.");
      router.push(`/purchase-orders/${poId}`);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Montant payé (MAD)</Label>
          <Input 
            type="number" 
            step="0.01" 
            value={amount} 
            onChange={(e) => setAmount(e.target.value)} 
            required 
          />
          <p className="text-xs text-muted-foreground">Reste à payer : {formatCurrency(remaining)}</p>
        </div>

        <div className="space-y-2">
          <Label>Date du paiement</Label>
          <Input 
            type="date" 
            value={date} 
            onChange={(e) => setDate(e.target.value)} 
            required 
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Mode de paiement</Label>
          <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="VIREMENT">Virement bancaire</SelectItem>
              <SelectItem value="CHEQUE">Chèque</SelectItem>
              <SelectItem value="TRAITE">Traite / LCN</SelectItem>
              <SelectItem value="CARTE">Carte bancaire</SelectItem>
              <SelectItem value="ESPECES">Espèces</SelectItem>
              <SelectItem value="AUTRE">Autre</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Référence (ex: n° de chèque, ID virement)</Label>
          <Input 
            value={reference} 
            onChange={(e) => setReference(e.target.value)} 
            placeholder="Optionnel"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Preuve de paiement (Reçu, copie chèque)</Label>
        <Input 
          type="file" 
          accept="application/pdf,image/*" 
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
      </div>

      <div className="space-y-2">
        <Label>Notes (Optionnel)</Label>
        <Textarea 
          value={notes} 
          onChange={(e) => setNotes(e.target.value)} 
          placeholder="Ex: Paiement de la première tranche..."
          className="resize-none"
        />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={pending}
        >
          Annuler
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
          Enregistrer le paiement
        </Button>
      </div>
    </form>
  );
}
