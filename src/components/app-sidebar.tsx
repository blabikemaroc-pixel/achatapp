"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardList,
  FileText,
  FolderTree,
  LayoutDashboard,
  Package,
  PackageOpen,
  ReceiptText,
  CreditCard,
  Settings,
  ShoppingCart,
  Truck,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { APP_NAME } from "@/lib/config";

const groups = [
  {
    label: "Pilotage",
    items: [
      { title: "Tableau de bord", href: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Référentiel",
    items: [
      { title: "Produits", href: "/products", icon: Package },
      { title: "Catégories", href: "/categories", icon: FolderTree },
      { title: "Fournisseurs", href: "/suppliers", icon: Truck },
    ],
  },
  {
    label: "Achats",
    items: [
      { title: "Demandes de prix", href: "/rfq", icon: FileText },
      { title: "Bons de commande", href: "/purchase-orders", icon: ClipboardList },
    ],
  },
  {
    label: "Logistique",
    items: [
      { title: "Bons de réception", href: "/receipts", icon: PackageOpen },
    ],
  },
  {
    label: "Comptabilité",
    items: [
      { title: "Factures", href: "/invoices", icon: ReceiptText },
      { title: "Paiements", href: "/payments", icon: CreditCard },
    ],
  },
];

const activeClass =
  "data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground data-[active=true]:hover:bg-sidebar-primary";

export function AppSidebar({ orgName }: { orgName?: string | null }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2.5 px-2 py-1.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <ShoppingCart className="size-4" />
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="text-sm font-semibold leading-tight text-white">
              {APP_NAME}
            </span>
            {orgName ? (
              <span className="truncate text-xs leading-tight text-sidebar-foreground/70">
                {orgName}
              </span>
            ) : null}
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={isActive(item.href)}
                      tooltip={item.title}
                      className={activeClass}
                      render={<Link href={item.href} />}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={isActive("/settings")}
              tooltip="Réglages"
              className={activeClass}
              render={<Link href="/settings" />}
            >
              <Settings />
              <span>Réglages</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
