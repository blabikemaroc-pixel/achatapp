import { FileText, Plus } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Demandes de prix" };

export default function RfqPage() {
  return (
    <>
      <PageHeader
        title="Demandes de prix"
        description="Consultez plusieurs fournisseurs et comparez leurs devis."
        action={
          <Button disabled>
            <Plus className="size-4" />
            Nouvelle demande
          </Button>
        }
      />
      <EmptyState
        icon={FileText}
        title="Demandes de prix & comparaison — Jalons 4 à 6"
        description="Sélectionnez un produit, choisissez les fournisseurs, envoyez la demande par e-mail (lien magique) puis comparez les devis côte à côte."
      />
    </>
  );
}
