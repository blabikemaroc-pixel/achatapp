"use client";

import { useTransition } from "react";
import Link from "next/link";
import { CheckCircle2, CreditCard, Loader2, Package, PackageCheck, ReceiptText, Send, XCircle } from "lucide-react";
import { toast } from "sonner";

import {
  sendPurchaseOrder,
  setPoStatus,
  uploadPoConfirmation,
  uploadProofFile,
} from "@/app/(app)/purchase-orders/actions";
import { Button, buttonVariants } from "@/components/ui/button";

type Status = "DRAFT" | "SENT" | "CONFIRMED" | "PARTIALLY_RECEIVED" | "RECEIVED" | "INVOICED" | "CANCELLED";

interface PoActionsProps {
  poId: string;
  status: Status;
  receiptCount?: number;
  invoiceCount?: number;
  unpaidInvoiceCount?: number;
}

export function PoActions({ poId, status, receiptCount = 0, invoiceCount = 0, unpaidInvoiceCount = 0 }: PoActionsProps) {
  const [pending, startTransition] = useTransition();

  const handleUploadConfirmation = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    startTransition(async () => {
      const formData = new FormData();
      formData.append("file", file);
      
      const uploadRes = await uploadProofFile(formData);
      if (uploadRes.error || !uploadRes.fileUrl) {
        toast.error(uploadRes.error || "Erreur d'upload");
        return;
      }

      const res = await uploadPoConfirmation(poId, uploadRes.fileUrl);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Confirmation enregistrée avec succès.");
    });
  };

  const run = (
    fn: () => Promise<{ error?: string; success?: boolean }>,
    ok: string,
  ) =>
    startTransition(async () => {
      const res = await fn();
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      toast.success(ok);
    });

  // ── Contextual hint based on status ──
  const hints: Record<string, { text: string; color: string }> = {
    DRAFT: { text: "📋 Prochaine étape : Envoyez cette commande au fournisseur", color: "bg-blue-50 border-blue-200 text-blue-800" },
    SENT: { text: "⏳ En attente : Importez la confirmation du fournisseur", color: "bg-yellow-50 border-yellow-200 text-yellow-800" },
    CONFIRMED: { text: "📦 Prochaine étape : Saisissez la réception quand la marchandise arrive", color: "bg-purple-50 border-purple-200 text-purple-800" },
    PARTIALLY_RECEIVED: { text: "📦 En cours : Une partie de la marchandise a été reçue, saisissez le reste quand il arrive", color: "bg-orange-50 border-orange-200 text-orange-800" },
    INVOICED: { text: "💳 Prochaine étape : Enregistrez le paiement de la facture", color: "bg-emerald-50 border-emerald-200 text-emerald-800" },
    RECEIVED: { text: "✅ Commande entièrement reçue", color: "bg-green-50 border-green-200 text-green-800" },
    CANCELLED: { text: "❌ Ce bon de commande est annulé", color: "bg-red-50 border-red-200 text-red-800" },
  };

  const hint = hints[status];

  return (
    <div className="space-y-3">
      {/* Contextual hint */}
      {hint && (
        <div className={`text-sm font-medium px-4 py-2.5 rounded-lg border ${hint.color}`}>
          {hint.text}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        {/* DRAFT actions */}
        {status === "DRAFT" && (
          <>
            <Button
              disabled={pending}
              onClick={() =>
                run(
                  () => sendPurchaseOrder(poId),
                  "Bon de commande envoyé au fournisseur.",
                )
              }
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              Envoyer au fournisseur
            </Button>
            <Button
              variant="outline"
              disabled={pending}
              onClick={() =>
                run(
                  () => setPoStatus(poId, "SENT"),
                  "Le bon de commande a été marqué comme envoyé.",
                )
              }
            >
              <CheckCircle2 className="size-4 mr-2" />
              Marquer comme envoyé (sans email)
            </Button>
            <Button
              variant="ghost"
              disabled={pending}
              className="text-muted-foreground hover:text-destructive"
              onClick={() =>
                run(() => setPoStatus(poId, "CANCELLED"), "Bon de commande annulé.")
              }
            >
              <XCircle className="size-4" />
              Annuler
            </Button>
          </>
        )}

        {/* SENT actions */}
        {status === "SENT" && (
          <>
            <div className="relative inline-block">
              <label
                className={`cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring border border-input bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 ${pending ? "opacity-50 pointer-events-none" : ""}`}
              >
                <CheckCircle2 className="mr-2 size-4" />
                Importer la confirmation
                <input 
                  type="file" 
                  className="hidden" 
                  accept="application/pdf,image/*"
                  onChange={handleUploadConfirmation}
                  disabled={pending}
                />
              </label>
            </div>
            <Button
              variant="ghost"
              disabled={pending}
              onClick={() =>
                run(() => sendPurchaseOrder(poId), "Renvoyé au fournisseur.")
              }
            >
              <Send className="size-4" />
              Renvoyer
            </Button>
          </>
        )}

        {/* CONFIRMED actions */}
        {status === "CONFIRMED" && (
          <Link
            href={`/purchase-orders/${poId}/receipts/new`}
            className={buttonVariants({ variant: "default" })}
          >
            <Package className="size-4 mr-2" />
            Saisir une réception
          </Link>
        )}

        {/* PARTIALLY_RECEIVED actions */}
        {status === "PARTIALLY_RECEIVED" && (
          <>
            <Link
              href={`/purchase-orders/${poId}/receipts/new`}
              className={buttonVariants({ variant: "default" })}
            >
              <Package className="size-4 mr-2" />
              Saisir le reste de la réception
            </Link>
            <Link
              href={`/purchase-orders/${poId}/invoices/new`}
              className={buttonVariants({ variant: "outline" })}
            >
              <ReceiptText className="size-4 mr-2" />
              Saisir une facture
            </Link>
          </>
        )}

        {/* INVOICED actions */}
        {status === "INVOICED" && unpaidInvoiceCount > 0 && (
          <Link
            href={`/invoices?poId=${poId}`}
            className={buttonVariants({ variant: "default" })}
          >
            <CreditCard className="size-4 mr-2" />
            Voir les factures à payer ({unpaidInvoiceCount})
          </Link>
        )}
      </div>
    </div>
  );
}
