import { PageHeader } from "@/components/page-header";
import { RfqBuilder } from "@/components/rfq/rfq-builder";
import { getOrgContext } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";

export const metadata = { title: "Nouvelle demande de prix" };

export default async function NewRfqPage() {
  const { orgId } = await getOrgContext();

  const [products, suppliers] = await Promise.all([
    prisma.product.findMany({
      where: { orgId },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        unit: true,
        defaultQty: true,
        category: { select: { name: true } },
      },
    }),
    prisma.supplier.findMany({
      where: { orgId },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        supplierProducts: { select: { productId: true } },
      },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Nouvelle demande de prix"
        description="Sélectionnez les produits, choisissez les fournisseurs, puis envoyez."
      />
      <RfqBuilder
        products={products.map((p) => ({
          id: p.id,
          name: p.name,
          unit: p.unit,
          defaultQty: p.defaultQty,
          category: p.category?.name ?? null,
        }))}
        suppliers={suppliers.map((s) => ({
          id: s.id,
          name: s.name,
          email: s.email,
          productIds: s.supplierProducts.map((sp) => sp.productId),
        }))}
      />
    </>
  );
}
