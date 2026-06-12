import { LoginForm } from "@/components/auth/login-form";

export const metadata = { title: "Connexion" };

export default function LoginPage() {
  const showDemo = process.env.NODE_ENV !== "production";

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h2 className="text-2xl font-semibold tracking-tight">Connexion</h2>
        <p className="text-sm text-muted-foreground">Accédez à votre espace.</p>
      </div>

      <LoginForm />

      {showDemo ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          Démo (dev) :{" "}
          <span className="font-medium">demo@procurement.local</span> /{" "}
          <span className="font-medium">demo1234</span>
        </div>
      ) : null}
    </div>
  );
}
