"use client";

import { useTransition } from "react";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { selectQuote } from "@/app/(app)/rfq/actions";
import { Button } from "@/components/ui/button";

export function SelectWinnerButton({
  quoteId,
  selected,
}: {
  quoteId: string;
  selected: boolean;
}) {
  const [pending, startTransition] = useTransition();

  if (selected) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
        <Check className="size-4" />
        Retenu
      </span>
    );
  }

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await selectQuote(quoteId);
          if (res?.error) {
            toast.error(res.error);
            return;
          }
          toast.success("Fournisseur retenu.");
        })
      }
    >
      {pending && <Loader2 className="size-4 animate-spin" />}
      Choisir
    </Button>
  );
}
