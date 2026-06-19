import { PageHeader } from "@/components/page-header";
import { SettingsForm } from "./settings-form";
import { getOrgContext } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";

export const metadata = { title: "Réglages" };

export default async function SettingsPage() {
  const { orgId } = await getOrgContext();
  
  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: orgId },
    select: {
      id: true,
      name: true,
      logo: true,
      address: true,
      city: true,
      phone: true,
      email: true,
      ice: true,
      rc: true,
      if: true,
      tp: true,
    }
  });

  return (
    <>
      <PageHeader
        title="Réglages de l'organisation"
        description="Gérez votre profil d'entreprise et vos identifiants légaux."
      />
      
      <div className="mx-auto max-w-4xl py-6">
        <SettingsForm org={org} />
      </div>
    </>
  );
}
