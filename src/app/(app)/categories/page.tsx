import { FolderTree, Plus } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Catégories" };

export default function CategoriesPage() {
  return (
    <>
      <PageHeader
        title="Catégories"
        description="Regroupez vos produits pour les retrouver facilement."
        action={
          <Button disabled>
            <Plus className="size-4" />
            Nouvelle catégorie
          </Button>
        }
      />
      <EmptyState
        icon={FolderTree}
        title="Gestion des catégories — Jalon 2"
        description="Créez des catégories (Alimentaire, Bureau, Entretien…) pour classer vos produits."
      />
    </>
  );
}
