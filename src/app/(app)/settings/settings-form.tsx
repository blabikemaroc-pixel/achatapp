"use client";

import { useTransition, useRef } from "react";
import { toast } from "sonner";
import { Upload, Trash2, Building2 } from "lucide-react";
import { updateOrganizationSettings, deleteOrganizationLogo } from "./actions";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Organization = {
  id: string;
  name: string;
  logo: string | null;
  address: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  ice: string | null;
  rc: string | null;
  if: string | null;
  tp: string | null;
};

export function SettingsForm({ org }: { org: Organization }) {
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    startTransition(async () => {
      const result = await updateOrganizationSettings(formData);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Paramètres enregistrés.");
      }
    });
  };

  const handleDeleteLogo = () => {
    if (!confirm("Voulez-vous vraiment supprimer le logo ?")) return;
    startTransition(async () => {
      await deleteOrganizationLogo();
      toast.success("Logo supprimé.");
    });
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Profil de l&apos;entreprise</CardTitle>
          <CardDescription>
            Ces informations apparaîtront sur vos bons de commande et demandes de prix.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-start gap-6">
            <div className="flex flex-col gap-3">
              <Label>Logo</Label>
              <div className="flex items-center gap-4">
                {org.logo ? (
                  <div className="relative h-20 w-32 rounded-md border bg-muted p-2 flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element -- logo servi depuis /files (route auth), pas d'optimisation next/image nécessaire */}
                    <img
                      src={`/files/${org.logo}`}
                      alt="Logo"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="flex h-20 w-32 items-center justify-center rounded-md border border-dashed bg-muted text-muted-foreground">
                    <Building2 className="h-8 w-8" />
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <div className="relative">
                    <Input
                      type="file"
                      id="logo"
                      name="logo"
                      accept="image/png, image/jpeg"
                      className="absolute inset-0 cursor-pointer opacity-0"
                    />
                    <Button type="button" variant="outline" className="w-full">
                      <Upload className="mr-2 h-4 w-4" />
                      Changer le logo
                    </Button>
                  </div>
                  {org.logo && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={handleDeleteLogo}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Supprimer
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Format recommandé : PNG ou JPG transparent. Max 8 Mo.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nom de l&apos;entreprise <span className="text-destructive">*</span></Label>
              <Input id="name" name="name" defaultValue={org.name} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail de contact</Label>
              <Input id="email" name="email" type="email" defaultValue={org.email ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone</Label>
              <Input id="phone" name="phone" defaultValue={org.phone ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">Ville</Label>
              <Input id="city" name="city" defaultValue={org.city ?? ""} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="address">Adresse complète</Label>
              <Input id="address" name="address" defaultValue={org.address ?? ""} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Identifiants légaux</CardTitle>
          <CardDescription>
            Vos identifiants (ICE, RC, etc.) seront imprimés sur le pied de page de vos documents.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="ice">ICE</Label>
              <Input id="ice" name="ice" defaultValue={org.ice ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="if">IF</Label>
              <Input id="if" name="if" defaultValue={org.if ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rc">RC</Label>
              <Input id="rc" name="rc" defaultValue={org.rc ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tp">Patente (TP)</Label>
              <Input id="tp" name="tp" defaultValue={org.tp ?? ""} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Enregistrement..." : "Enregistrer les modifications"}
        </Button>
      </div>
    </form>
  );
}
