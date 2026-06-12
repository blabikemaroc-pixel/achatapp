# Achats — comparateur de prix fournisseurs

Application web de **e-procurement** : catalogue produits, fournisseurs, demandes de prix
multi-fournisseurs (RFQ), comparaison des devis et bons de commande. Multi-organisations
(chaque utilisateur ne voit que ses données).

## Stack

- **Next.js 16** (App Router) · React 19 · TypeScript
- **Tailwind CSS v4** + **shadcn/ui** (Base UI) — palette navy/bleu, police Plus Jakarta Sans
- **PostgreSQL** + **Prisma 6**
- **Auth.js** (à venir, Jalon 1) · **Nodemailer** (e-mails RFQ / bons de commande)
- Dev : **Docker** (Postgres + Mailpit)

## Démarrage (développement)

Prérequis : Node 20+, Docker Desktop.

```bash
# 1. Dépendances
npm install

# 2. Services Docker (Postgres + Mailpit)
docker compose up -d
#   Postgres → localhost:5433   (5433 pour éviter un Postgres local sur 5432)
#   Mailpit  → SMTP localhost:1025  |  UI http://localhost:8025

# 3. Base de données : migration + données de démo
npx prisma migrate dev
npm run db:seed

# 4. Lancer l'app
npm run dev
#   → http://localhost:3010
```

### Connexion de démo

> **demo@procurement.local** / **demo1234** (utilisable dès que l'auth sera branchée — Jalon 1)

## Scripts

| Script | Rôle |
|--------|------|
| `npm run dev` | Serveur de dev (port 3010) |
| `npm run build` / `npm start` | Build et serveur de production |
| `npm run lint` | ESLint |
| `npm run db:migrate` | Créer/appliquer une migration Prisma |
| `npm run db:seed` | Insérer les données de démo |
| `npm run db:studio` | Explorer la base (Prisma Studio) |

## Configuration

Variables dans `.env` (voir `.env.example`) : `DATABASE_URL`, `AUTH_SECRET`, `APP_URL`,
et le bloc SMTP (`SMTP_HOST`, `SMTP_PORT`, …). En dev, les e-mails partent dans **Mailpit**
(http://localhost:8025). En production : SMTP réel + SPF/DKIM/DMARC sur le domaine.

## Feuille de route

- **Jalon 0** ✅ Fondations : design system, shell (sidebar), base de données, Docker
- **Jalon 1** Authentification + organisations (multi-tenant)
- **Jalon 2** Catalogue (catégories, produits)
- **Jalon 3** Fournisseurs + association produits
- **Jalon 4** Demandes de prix (RFQ) + envoi e-mail (lien magique)
- **Jalon 5** Portail fournisseur (saisie du devis) + saisie manuelle
- **Jalon 6** Comparaison des devis côte à côte
- **Jalon 7** Bons de commande (PDF + envoi + suivi)
- **Jalon 8** Tableau de bord & historique de prix
- **Jalon 9** Déploiement VPS (Docker Compose + Caddy)
