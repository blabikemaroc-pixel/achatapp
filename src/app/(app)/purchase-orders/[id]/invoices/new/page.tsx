import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { getOrgContext } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { InvoiceForm } from "./invoice-form";

export const metadata = { title: "Saisir une facture" };

export default async function NewInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { orgId } = await getOrgContext();

  const po = await prisma.purchaseOrder.findFirst({
    where: { id, orgId },
    include: {
      items: { include: { product: true } },
    },
  });
  if (!po) notFound();

  return (
    <div className="max-w-4xl mx-auto">
      <Link
        href={`/purchase-orders/${po.id}`}
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="size-4" /> Retour au bon de commande
      </Link>

      <PageHeader
        title="Saisir une Facture Fournisseur"
        description={`Pour la commande ${po.reference}`}
      />

      <InvoiceForm po={po} />
    </div>
  );
}
