"use client";

import { useState } from "react";
import { FilePlus2, Pencil } from "lucide-react";

import { enterQuote } from "@/app/(app)/rfq/actions";
import {
  QuoteForm,
  type QuoteFormItem,
  type QuoteInitial,
} from "@/components/quote/quote-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function QuoteEntryButton({
  recipientId,
  supplierName,
  items,
  initial,
  hasQuote,
}: {
  recipientId: string;
  supplierName: string;
  items: QuoteFormItem[];
  initial?: QuoteInitial;
  hasQuote: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        {hasQuote ? (
          <>
            <Pencil className="size-4" />
            Modifier
          </>
        ) : (
          <>
            <FilePlus2 className="size-4" />
            Saisir le devis
          </>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Devis — {supplierName}</DialogTitle>
            <DialogDescription>
              Saisissez le prix et les conditions communiqués par le
              fournisseur.
            </DialogDescription>
          </DialogHeader>
          {open ? (
            <QuoteForm
              items={items}
              initial={initial}
              onSubmit={(input) => enterQuote(recipientId, input)}
              onSuccess={() => setOpen(false)}
              submitLabel="Enregistrer le devis"
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
