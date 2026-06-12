/**
 * Provisioning d'un client : crée son organisation + son 1er administrateur.
 * À lancer lors du déploiement d'une nouvelle instance client.
 *
 *   npm run create:admin -- --email admin@client.com --password "MotDePasseFort" --org "Client SARL" [--name "Nom Admin"]
 *
 * Il n'existe AUCUNE inscription publique : c'est le seul moyen de créer le
 * premier compte. L'admin invitera ensuite son équipe depuis l'application.
 */
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  if (i !== -1 && process.argv[i + 1]) return process.argv[i + 1];
  const eq = process.argv.find((a) => a.startsWith(`--${name}=`));
  return eq ? eq.slice(name.length + 3) : undefined;
}

async function main() {
  const email = arg("email")?.toLowerCase().trim();
  const password = arg("password");
  const orgName = arg("org");
  const name = arg("name") ?? "Administrateur";

  if (!email || !password || !orgName) {
    console.error(
      'Usage : npm run create:admin -- --email <email> --password <mdp> --org "<Nom du client>" [--name "<Nom>"]',
    );
    process.exit(1);
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    console.error("Adresse e-mail invalide.");
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("Mot de passe trop court (8 caractères minimum).");
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.error(`Un compte existe déjà avec cet e-mail : ${email}`);
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.$transaction(async (tx) => {
    const org = await tx.organization.create({ data: { name: orgName } });
    const user = await tx.user.create({
      data: { name, email, passwordHash },
    });
    await tx.membership.create({
      data: { userId: user.id, orgId: org.id, role: Role.ADMIN },
    });
  });

  console.log(`✓ Administrateur créé : ${email}  (organisation : ${orgName})`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
