import { ShoppingCart } from "lucide-react";
import { notFound } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { prisma } from "@/lib/db";
import { formatDate, formatNumber } from "@/lib/format";

export const metadata = { title: "Demande de prix" };

export default async function QuotePortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const recipient = await prisma.rfqRecipient.findUnique({
    where: { token },
    include: {
      supplier: { select: { name: true } },
      rfq: {
        include: {
          items: {
            include: { product: { select: { name: true, unit: true } } },
          },
          org: { select: { name: true } },
        },
      },
    },
  });
  if (!recipient) notFound();

  const { rfq, supplier } = recipient;

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 p-4 sm:p-8">
      <header className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <ShoppingCart className="size-5" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{rfq.org.name}</p>
          <h1 className="text-lg font-semibold">
            Demande de prix {rfq.reference}
          </h1>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Bonjour {supplier.name}</CardTitle>
          <CardDescription>
            <strong>{rfq.org.name}</strong> souhaite recevoir votre devis pour
            les produits ci-dessous
            {rfq.dueDate ? (
              <> — réponse souhaitée avant le {formatDate(rfq.dueDate)}</>
            ) : null}
            .
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-hidden rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produit</TableHead>
                  <TableHead className="text-right">Quantité</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rfq.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {item.product.name}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(item.quantity)} {item.product.unit}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {rfq.notes ? (
            <p className="text-sm text-muted-foreground">{rfq.notes}</p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-6 text-center text-sm text-muted-foreground">
          La saisie de votre prix et de vos conditions sera disponible ici très
          prochainement.
        </CardContent>
      </Card>
    </div>
  );
}
