"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";

import { submitQuote } from "@/app/quote/actions";
import {
  QuoteForm,
  type QuoteFormItem,
  type QuoteInitial,
} from "@/components/quote/quote-form";
import { Card, CardContent } from "@/components/ui/card";

export function QuotePortalClient({
  token,
  items,
  initial,
  alreadyResponded,
}: {
  token: string;
  items: QuoteFormItem[];
  initial?: QuoteInitial;
  alreadyResponded: boolean;
}) {
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <CheckCircle2 className="size-10 text-primary" />
          <div>
            <p className="font-medium">Merci, votre devis a bien été envoyé.</p>
            <p className="text-sm text-muted-foreground">
              Vous pouvez fermer cette page.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        {alreadyResponded ? (
          <p className="rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
            Vous avez déjà répondu. Vous pouvez modifier votre devis ci-dessous.
          </p>
        ) : null}
        <QuoteForm
          items={items}
          initial={initial}
          onSubmit={(input) => submitQuote(token, input)}
          onSuccess={() => setDone(true)}
          submitLabel="Envoyer mon devis"
        />
      </CardContent>
    </Card>
  );
}
