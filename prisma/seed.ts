import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "demo@procurement.local";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log("Seed déjà appliqué (utilisateur démo présent). Abandon.");
    return;
  }

  const passwordHash = await bcrypt.hash("demo1234", 10);

  const org = await prisma.organization.create({
    data: { name: "Ma Société Démo" },
  });

  const user = await prisma.user.create({
    data: { email, name: "Utilisateur Démo", passwordHash },
  });

  await prisma.membership.create({
    data: { userId: user.id, orgId: org.id, role: Role.ADMIN },
  });

  // ── Catégories ──
  const alimentaire = await prisma.category.create({
    data: { orgId: org.id, name: "Alimentaire" },
  });
  const bureau = await prisma.category.create({
    data: { orgId: org.id, name: "Fournitures de bureau" },
  });
  const entretien = await prisma.category.create({
    data: { orgId: org.id, name: "Entretien & hygiène" },
  });

  // ── Produits ──
  const produits = await Promise.all([
    prisma.product.create({
      data: { orgId: org.id, categoryId: alimentaire.id, name: "Huile d'olive 5L", reference: "ALM-001", unit: "bidon", defaultQty: 10 },
    }),
    prisma.product.create({
      data: { orgId: org.id, categoryId: alimentaire.id, name: "Farine T55 25kg", reference: "ALM-002", unit: "sac", defaultQty: 20 },
    }),
    prisma.product.create({
      data: { orgId: org.id, categoryId: alimentaire.id, name: "Sucre blanc 50kg", reference: "ALM-003", unit: "sac", defaultQty: 15 },
    }),
    prisma.product.create({
      data: { orgId: org.id, categoryId: bureau.id, name: "Ramette papier A4 80g", reference: "BUR-001", unit: "carton", defaultQty: 30 },
    }),
    prisma.product.create({
      data: { orgId: org.id, categoryId: bureau.id, name: "Stylo bille bleu (boîte 50)", reference: "BUR-002", unit: "boîte", defaultQty: 12 },
    }),
    prisma.product.create({
      data: { orgId: org.id, categoryId: entretien.id, name: "Détergent multi-usage 5L", reference: "ENT-001", unit: "bidon", defaultQty: 8 },
    }),
  ]);

  // ── Fournisseurs ──
  const fournisseurs = await Promise.all([
    prisma.supplier.create({
      data: { orgId: org.id, name: "Grossiste Atlas", contactName: "M. Karim", email: "contact@atlas-grossiste.test", phone: "0521000001", paymentTerms: "30 jours" },
    }),
    prisma.supplier.create({
      data: { orgId: org.id, name: "Distrib Pro", contactName: "Mme Sofia", email: "ventes@distribpro.test", phone: "0521000002", paymentTerms: "Comptant" },
    }),
    prisma.supplier.create({
      data: { orgId: org.id, name: "Comptoir Général", contactName: "M. Reda", email: "devis@comptoir-general.test", phone: "0521000003", paymentTerms: "45 jours" },
    }),
  ]);

  // ── Qui fournit quoi (chaque fournisseur couvre plusieurs produits) ──
  const links: { supplierId: string; productId: string }[] = [];
  for (const f of fournisseurs) {
    for (const p of produits) {
      // ~70% de chance qu'un fournisseur propose un produit
      if (Math.random() < 0.7) links.push({ supplierId: f.id, productId: p.id });
    }
  }
  // garantir qu'au moins 2 fournisseurs couvrent le 1er produit (pour tester la comparaison)
  links.push({ supplierId: fournisseurs[0].id, productId: produits[0].id });
  links.push({ supplierId: fournisseurs[1].id, productId: produits[0].id });

  await prisma.supplierProduct.createMany({ data: links, skipDuplicates: true });

  console.log("✓ Seed terminé.");
  console.log("  Connexion démo →  demo@procurement.local  /  demo1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
