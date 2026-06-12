import Link from "next/link";
import {
  ArrowRight,
  ClipboardList,
  FileText,
  FolderTree,
  Package,
  Truck,
} from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getOrgContext } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";

export const metadata = { title: "Tableau de bord" };

export default async function DashboardPage() {
  const { orgId } = await getOrgContext();

  const [products, suppliers, openRfq, purchaseOrders] = await Promise.all([
    prisma.product.count({ where: { orgId } }),
    prisma.supplier.count({ where: { orgId } }),
    prisma.rfq.count({ where: { orgId, status: "SENT" } }),
    prisma.purchaseOrder.count({ where: { orgId } }),
  ]);

  const stats = [
    { label: "Produits", value: products, icon: Package, href: "/products" },
    { label: "Fournisseurs", value: suppliers, icon: Truck, href: "/suppliers" },
    { label: "Demandes en cours", value: openRfq, icon: FileText, href: "/rfq" },
    {
      label: "Bons de commande",
      value: purchaseOrders,
      icon: ClipboardList,
      href: "/purchase-orders",
    },
  ];

  const steps = [
    {
      title: "Créez votre catalogue",
      description: "Ajoutez vos catégories et vos produits (unité, quantité, référence).",
      href: "/products",
      icon: FolderTree,
    },
    {
      title: "Ajoutez vos fournisseurs",
      description: "Renseignez leurs coordonnées et les produits qu'ils peuvent fournir.",
      href: "/suppliers",
      icon: Truck,
    },
    {
      title: "Lancez une demande de prix",
      description: "Sélectionnez un produit, choisissez des fournisseurs, comparez les devis.",
      href: "/rfq",
      icon: FileText,
    },
  ];

  return (
    <>
      <PageHeader
        title="Tableau de bord"
        description="Vue d'ensemble de votre activité achats."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href} className="group">
            <Card className="transition-colors group-hover:ring-primary/30">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
                <CardAction>
                  <stat.icon className="size-4 text-muted-foreground" />
                </CardAction>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold tabular-nums">
                  {stat.value}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">
          Premiers pas
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {steps.map((step) => (
            <Card key={step.title} className="flex flex-col">
              <CardHeader>
                <div className="flex size-9 items-center justify-center rounded-md bg-accent text-accent-foreground">
                  <step.icon className="size-4" />
                </div>
                <CardTitle className="mt-2">{step.title}</CardTitle>
                <CardDescription>{step.description}</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto">
                <Link
                  href={step.href}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  Ouvrir
                  <ArrowRight className="size-4" />
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
