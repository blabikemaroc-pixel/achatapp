import { PackageOpen } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { getOrgContext } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Bons de réception" };

export default async function ReceiptsPage(props: {
  searchParams?: Promise<{ poId?: string }>;
}) {
  const searchParams = await props.searchParams;
  const poId = searchParams?.poId;
  const { orgId } = await getOrgContext();

  const receipts = await prisma.receipt.findMany({
    where: { 
      po: { orgId },
      ...(poId ? { poId } : {})
    },
    include: {
      po: {
        include: { supplier: true }
      },
      items: {
        include: { product: { select: { name: true, unit: true } } }
      },
    },
    orderBy: { date: "desc" },
  });

  return (
    <>
      <PageHeader
        title="Bons de réception"
        description={poId ? "Filtrés pour une commande spécifique" : "Suivi de toutes les livraisons fournisseurs"}
      />

      {receipts.length === 0 ? (
        <EmptyState
          icon={PackageOpen}
          title="Aucun bon de réception"
          description="Les bons de réception sont créés depuis la page d'un Bon de Commande confirmé."
        />
      ) : (
        <div className="space-y-4">
          {receipts.map((r) => (
            <div key={r.id} className="rounded-xl border border-border bg-white shadow-sm overflow-hidden">
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between bg-slate-50 px-5 py-4 border-b border-border gap-3">
                <div>
                  <p className="font-bold text-base">BL: {r.reference}</p>
                  <p className="text-sm text-muted-foreground">
                    Reçu le {formatDate(r.date)} — Fournisseur : <span className="font-medium text-foreground">{r.po.supplier.name}</span>
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Link
                    href={`/purchase-orders/${r.poId}`}
                    className="text-sm text-blue-600 hover:underline font-medium"
                  >
                    Commande {r.po.reference}
                  </Link>
                  {r.fileUrl && (
                    <a href={r.fileUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline font-medium border-l pl-3 border-slate-200">
                      Ouvrir le BL
                    </a>
                  )}
                </div>
              </div>
              {/* Items */}
              <div className="px-5 py-3">
                <div className="flex flex-wrap gap-3">
                  {r.items.map((item) => (
                    <Badge key={item.id} variant="secondary" className="text-xs py-1 px-3">
                      {item.product.name} : {item.quantity} {item.product.unit}
                    </Badge>
                  ))}
                </div>
              </div>
              {r.notes && (
                <div className="px-5 pb-3">
                  <p className="text-xs text-muted-foreground bg-yellow-50 p-2 rounded border border-yellow-100">{r.notes}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
