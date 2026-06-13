import { Truck } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import {
  NewSupplierButton,
  SupplierRowActions,
  type ProductOption,
} from "@/components/suppliers/supplier-ui";
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

export const metadata = { title: "Fournisseurs" };

export default async function SuppliersPage() {
  const { orgId } = await getOrgContext();

  const [suppliers, products, links] = await Promise.all([
    prisma.supplier.findMany({
      where: { orgId },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        contactName: true,
        email: true,
        phone: true,
        address: true,
        paymentTerms: true,
        notes: true,
        _count: { select: { supplierProducts: true } },
      },
    }),
    prisma.product.findMany({
      where: { orgId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, category: { select: { name: true } } },
    }),
    prisma.supplierProduct.findMany({
      where: { supplier: { orgId } },
      select: { supplierId: true, productId: true },
    }),
  ]);

  const productOptions: ProductOption[] = products.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category?.name ?? null,
  }));

  const productsBySupplier = new Map<string, string[]>();
  for (const link of links) {
    const list = productsBySupplier.get(link.supplierId) ?? [];
    list.push(link.productId);
    productsBySupplier.set(link.supplierId, list);
  }

  return (
    <>
      <PageHeader
        title="Fournisseurs"
        description="Vos fournisseurs et les produits qu'ils peuvent fournir."
        action={<NewSupplierButton />}
      />

      {suppliers.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="Aucun fournisseur"
          description="Ajoutez un fournisseur, puis indiquez les produits qu'il peut fournir."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fournisseur</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead className="text-right">Produits</TableHead>
                <TableHead className="w-32 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliers.map((supplier) => (
                <TableRow key={supplier.id}>
                  <TableCell className="font-medium">
                    {supplier.name}
                    {supplier.paymentTerms ? (
                      <span className="block text-xs font-normal text-muted-foreground">
                        {supplier.paymentTerms}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {supplier.contactName ?? "—"}
                    {supplier.phone ? (
                      <span className="block text-xs">{supplier.phone}</span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {supplier.email}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="secondary" className="tabular-nums">
                      {supplier._count.supplierProducts}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <SupplierRowActions
                      supplier={{
                        id: supplier.id,
                        name: supplier.name,
                        contactName: supplier.contactName,
                        email: supplier.email,
                        phone: supplier.phone,
                        address: supplier.address,
                        paymentTerms: supplier.paymentTerms,
                        notes: supplier.notes,
                      }}
                      products={productOptions}
                      selectedProductIds={productsBySupplier.get(supplier.id) ?? []}
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
