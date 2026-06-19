"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createPurchaseOrderFromQuote } from "@/app/(app)/purchase-orders/actions";
import { Button } from "@/components/ui/button";

export function GeneratePoButton({ quoteId }: { quoteId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await createPurchaseOrderFromQuote(quoteId);
          if (res?.error) {
            toast.error(res.error);
            return;
          }
          toast.success("Bon de commande créé.");
          router.push(`/purchase-orders/${res.id}`);
        })
      }
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <FileText className="size-4" />
      )}
      Bon de commande
    </Button>
  );
}
