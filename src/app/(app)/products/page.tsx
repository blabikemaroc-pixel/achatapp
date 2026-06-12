import { Package, Plus } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Produits" };

export default function ProductsPage() {
  return (
    <>
      <PageHeader
        title="Produits"
        description="Votre catalogue, organisé par catégorie."
        action={
          <Button disabled>
            <Plus className="size-4" />
            Nouveau produit
          </Button>
        }
      />
      <EmptyState
        icon={Package}
        title="Gestion du catalogue — Jalon 2"
        description="Vous pourrez ajouter vos produits avec leur unité, quantité par défaut et référence, puis les classer par catégorie."
      />
    </>
  );
}
