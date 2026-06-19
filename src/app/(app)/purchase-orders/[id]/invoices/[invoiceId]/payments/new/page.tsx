import { notFound } from "next/navigation";

import { getOrgContext } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { formatCurrency } from "@/lib/format";
import { PaymentForm } from "./payment-form";

export default async function NewPaymentPage({
  params,
}: {
  params: Promise<{ id: string; invoiceId: string }>;
}) {
  const { id, invoiceId } = await params;
  const { orgId } = await getOrgContext();

  const po = await prisma.purchaseOrder.findFirst({
    where: { id, orgId },
  });

  if (!po) notFound();

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, poId: id, orgId },
    include: { payments: true },
  });

  if (!invoice) notFound();

  const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = Math.max(0, invoice.amountTTC - totalPaid);

  if (remaining <= 0.01) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Saisir un paiement</h1>
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
          Cette facture est déjà intégralement payée.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Saisir un paiement</h1>
        <p className="text-muted-foreground">
          Facture {invoice.reference} (Total: {formatCurrency(invoice.amountTTC)})
        </p>
      </div>

      <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
        <PaymentForm invoice={invoice} poId={id} remaining={remaining} />
      </div>
    </div>
  );
}
