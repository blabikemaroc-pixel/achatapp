import { FolderTree } from "lucide-react";

import {
  CategoryRowActions,
  NewCategoryButton,
} from "@/components/categories/category-ui";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getOrgContext } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";

export const metadata = { title: "Catégories" };

export default async function CategoriesPage() {
  const { orgId } = await getOrgContext();
  const categories = await prisma.category.findMany({
    where: { orgId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, _count: { select: { products: true } } },
  });

  return (
    <>
      <PageHeader
        title="Catégories"
        description="Regroupez vos produits pour les retrouver facilement."
        action={<NewCategoryButton />}
      />

      {categories.length === 0 ? (
        <EmptyState
          icon={FolderTree}
          title="Aucune catégorie"
          description="Créez votre première catégorie (Alimentaire, Bureau, Entretien…)."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead className="w-32 text-right">Produits</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {category._count.products}
                  </TableCell>
                  <TableCell>
                    <CategoryRowActions
                      category={{ id: category.id, name: category.name }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
