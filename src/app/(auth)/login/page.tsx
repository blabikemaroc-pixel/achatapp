import { LoginForm } from "@/components/auth/login-form";

export const metadata = { title: "Connexion" };

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h2 className="text-2xl font-semibold tracking-tight">Connexion</h2>
        <p className="text-sm text-muted-foreground">Accédez à votre espace.</p>
      </div>

      <LoginForm />
    </div>
  );
}
