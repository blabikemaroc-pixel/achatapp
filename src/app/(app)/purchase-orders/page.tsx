import { ClipboardList, Plus } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Bons de commande" };

export default function PurchaseOrdersPage() {
  return (
    <>
      <PageHeader
        title="Bons de commande"
        description="Générez et envoyez vos bons de commande aux fournisseurs retenus."
        action={
          <Button disabled>
            <Plus className="size-4" />
            Nouveau bon de commande
          </Button>
        }
      />
      <EmptyState
        icon={ClipboardList}
        title="Bons de commande — Jalon 7"
        description="Depuis le devis retenu, générez un bon de commande au format PDF, envoyez-le et suivez son statut (envoyé, confirmé, reçu)."
      />
    </>
  );
}
