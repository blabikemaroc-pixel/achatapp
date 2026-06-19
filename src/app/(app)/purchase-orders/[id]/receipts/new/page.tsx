import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { getOrgContext } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { ReceiptForm } from "./receipt-form";

export const metadata = { title: "Saisir une réception" };

export default async function NewReceiptPage({
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
      receipts: { include: { items: true } },
    },
  });
  if (!po) notFound();

  return (
    <div className="max-w-3xl mx-auto">
      <Link
        href={`/purchase-orders/${po.id}`}
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="size-4" /> Retour au bon de commande
      </Link>

      <PageHeader
        title="Saisir un Bon de Réception (BL)"
        description={`Pour la commande ${po.reference}`}
      />

      <ReceiptForm po={po} />
    </div>
  );
}
