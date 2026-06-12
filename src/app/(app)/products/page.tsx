import { Package } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import {
  NewProductButton,
  ProductRowActions,
  type CategoryOption,
} from "@/components/products/product-ui";
import { Badge } from "@/components/ui/badge";
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
import { formatNumber } from "@/lib/format";

export const metadata = { title: "Produits" };

export default async function ProductsPage() {
  const { orgId } = await getOrgContext();
  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where: { orgId },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        reference: true,
        unit: true,
        defaultQty: true,
        description: true,
        categoryId: true,
        category: { select: { name: true } },
      },
    }),
    prisma.category.findMany({
      where: { orgId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const categoryOptions: CategoryOption[] = categories;

  return (
    <>
      <PageHeader
        title="Produits"
        description="Votre catalogue, organisé par catégorie."
        action={<NewProductButton categories={categoryOptions} />}
      />

      {products.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Aucun produit"
          description="Ajoutez votre premier produit avec son unité, sa quantité et sa référence."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produit</TableHead>
                <TableHead>Référence</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Unité</TableHead>
                <TableHead className="text-right">Qté</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {product.reference ?? "—"}
                  </TableCell>
                  <TableCell>
                    {product.category ? (
                      <Badge variant="secondary">{product.category.name}</Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {product.unit}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {product.defaultQty != null
                      ? formatNumber(product.defaultQty)
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <ProductRowActions
                      product={{
                        id: product.id,
                        name: product.name,
                        reference: product.reference,
                        unit: product.unit,
                        defaultQty: product.defaultQty,
                        description: product.description,
                        categoryId: product.categoryId,
                      }}
                      categories={categoryOptions}
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
