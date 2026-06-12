import { Settings } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";

export const metadata = { title: "Réglages" };

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Réglages"
        description="Organisation, équipe et configuration des e-mails."
      />
      <EmptyState
        icon={Settings}
        title="Réglages — à venir"
        description="Gérez le nom de votre organisation, invitez des collègues (rôles) et configurez l'envoi d'e-mails."
      />
    </>
  );
}
