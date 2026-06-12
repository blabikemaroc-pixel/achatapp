import { Plus, Truck } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Fournisseurs" };

export default function SuppliersPage() {
  return (
    <>
      <PageHeader
        title="Fournisseurs"
        description="Vos fournisseurs et les produits qu'ils peuvent fournir."
        action={
          <Button disabled>
            <Plus className="size-4" />
            Nouveau fournisseur
          </Button>
        }
      />
      <EmptyState
        icon={Truck}
        title="Gestion des fournisseurs — Jalon 3"
        description="Enregistrez les coordonnées (contact, e-mail, conditions de paiement) et associez chaque fournisseur aux produits qu'il propose."
      />
    </>
  );
}
