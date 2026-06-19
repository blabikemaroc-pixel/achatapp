"use client";

import { useState } from "react";
import { Copy, Mail } from "lucide-react";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ManualEmailButton({
  to,
  subject,
  body,
}: {
  to: string;
  subject: string;
  body: string;
}) {
  const [open, setOpen] = useState(false);

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copié.`);
    } catch {
      toast.error("Copie impossible.");
    }
  };

  const mailto = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(
    subject,
  )}&body=${encodeURIComponent(body)}`;

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Mail className="size-4" />
        E-mail
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>E-mail au fournisseur</DialogTitle>
            <DialogDescription>
              Copiez-collez ce message dans votre messagerie, ou ouvrez-le
              directement pré-rempli.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="me-to">Destinataire</Label>
              <div className="flex gap-2">
                <Input id="me-to" readOnly value={to} />
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Copier l'adresse"
                  onClick={() => copy(to, "Adresse")}
                >
                  <Copy className="size-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="me-subject">Objet</Label>
              <div className="flex gap-2">
                <Input id="me-subject" readOnly value={subject} />
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Copier l'objet"
                  onClick={() => copy(subject, "Objet")}
                >
                  <Copy className="size-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="me-body">Message</Label>
              <Textarea
                id="me-body"
                readOnly
                rows={9}
                value={body}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <Button variant="outline" onClick={() => copy(body, "Message")}>
              <Copy className="size-4" />
              Copier le message
            </Button>
            <a href={mailto} className={buttonVariants()}>
              <Mail className="size-4" />
              Ouvrir dans ma messagerie
            </a>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
