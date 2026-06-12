import { CheckCircle2, ShoppingCart } from "lucide-react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { APP_NAME } from "@/lib/config";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  const features = [
    "Comparez les prix de plusieurs fournisseurs en un clic",
    "Recevez les devis directement dans l'application",
    "Générez et envoyez vos bons de commande",
  ];

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between bg-sidebar p-10 text-sidebar-foreground lg:flex">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <ShoppingCart className="size-5" />
          </div>
          <span className="text-lg font-semibold text-white">{APP_NAME}</span>
        </div>

        <div className="space-y-6">
          <h1 className="max-w-md text-3xl font-semibold leading-tight text-white">
            Vos achats, centralisés et comparés.
          </h1>
          <ul className="space-y-3">
            {features.map((feature) => (
              <li
                key={feature}
                className="flex items-start gap-3 text-sm text-slate-300"
              >
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-sidebar-primary" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-slate-400">
          © {new Date().getFullYear()} {APP_NAME}
        </p>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
