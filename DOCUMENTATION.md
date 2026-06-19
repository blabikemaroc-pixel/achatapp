# 📘 Documentation — Application de consultation des prix (Achats)

> Application web privée de **e-procurement** : catalogue → fournisseurs → demande de prix (RFQ) → devis → comparaison → bon de commande.
> Document mis à jour le **14/06/2026**.

---

## 1. En bref

- **Ce que fait l'app** : centraliser les achats. On enregistre des produits (par catégorie) et des fournisseurs (avec qui fournit quoi), on envoie une **demande de prix** à plusieurs fournisseurs, on reçoit leurs **devis** (via un lien magique ou en saisie manuelle), on les **compare** côte à côte, on choisit le meilleur, puis on génère et envoie un **bon de commande PDF**.
- **Modèle** : **PAS un SaaS public**. Application **privée, mono-client par instance**, hébergée par toi sur ton VPS. **Aucune inscription publique** : c'est toi qui crées le compte de chaque client.
- **Multi-utilisateur** : chaque client a ses **propres données isolées** (organisation). Connexion simple : e-mail + mot de passe, session de 30 jours.

---

## 2. 🔑 Identifiants & accès (environnement de développement)

> ⚠️ Ce sont des valeurs **de développement local uniquement**. À changer impérativement avant la mise en production (voir §12).

| Accès | Valeur |
|---|---|
| **Application (dev)** | http://localhost:3010 |
| **Compte de démonstration** | `demo@procurement.local` / `demo1234` |
| **Base de données PostgreSQL** (Docker) | hôte `localhost`, port **5433**, utilisateur `postgres`, mot de passe `postgres`, base `procurement` |
| **Mailpit** (boîte mail de test) | SMTP `localhost:1025` · interface web **http://localhost:8025** |
| **AUTH_SECRET** (dev) | valeur provisoire dans `.env` (à régénérer pour la prod) |

- Le port **5433** (au lieu de 5432) est volontaire : tu as déjà un PostgreSQL 18 installé sur 5432.
- Le port **3010** est volontaire : le 3000 était occupé sur ta machine.
- Tous ces réglages sont dans les fichiers **`.env`** (non versionné) et **`docker-compose.yml`**.
- Les e-mails partent dans **Mailpit** en dev (rien n'est réellement envoyé) — consultables sur http://localhost:8025.

---

## 3. 🚀 Démarrer en local

Prérequis : **Node 20+**, **Docker Desktop**.

```bash
# 1. Dépendances
npm install

# 2. Lancer Postgres + Mailpit (Docker)
docker compose up -d

# 3. Base de données : migrations + données de démo
npx prisma migrate dev
npm run db:seed

# 4. Lancer l'application
npm run dev
#  → http://localhost:3010   (connexion : demo@procurement.local / demo1234)
```

---

## 4. 🛠️ Commandes utiles

| Commande | Rôle |
|---|---|
| `npm run dev` | Serveur de développement (port 3010) |
| `npm run build` / `npm start` | Build et serveur de production |
| `npm run lint` | Vérification ESLint |
| `npx tsc --noEmit` | Vérification des types TypeScript |
| `docker compose up -d` / `docker compose down` | Démarrer / arrêter Postgres + Mailpit |
| `npm run db:migrate` | Créer/appliquer une migration Prisma |
| `npm run db:seed` | Insérer les données de démonstration |
| `npm run db:studio` | Explorer la base visuellement (Prisma Studio) |
| `npm run create:admin -- ...` | **Créer un client + son 1er administrateur** (voir §5) |

> Astuce dev : si une page affiche du contenu périmé après une grosse modification, arrête le serveur, supprime le cache `.next` (`rmdir /s /q .next` sous Windows) puis relance `npm run dev`.

---

## 5. 👤 Créer un client (provisioning)

Il n'y a **pas d'inscription en ligne**. Pour ouvrir un accès à un client, tu lances :

```bash
npm run create:admin -- --email admin@client.com --password "MotDePasseFort" --org "Nom du client" --name "Nom Admin"
```

Cela crée l'organisation du client + son premier compte **administrateur**. Ensuite, cet admin pourra (fonctionnalité à venir, voir §10) inviter ses collègues.

---

## 6. 🧱 Stack technique

| Couche | Technologie |
|---|---|
| Framework | **Next.js 16** (App Router) + **React 19** + **TypeScript** |
| UI | **Tailwind CSS v4** + **shadcn/ui** (basé sur Base UI) |
| Design | Style « Flat », **navy `#0F172A` + bleu `#0369A1`**, police **Plus Jakarta Sans**, mode clair/sombre |
| Base de données | **PostgreSQL 16** (Docker) |
| ORM | **Prisma 6** |
| Authentification | **Auth.js v5** (Credentials, session JWT 30 jours) |
| E-mails | **Nodemailer** (SMTP configurable ; Mailpit en dev) |
| PDF | **pdf-lib** |
| Autres | next-themes, zod, react-hook-form, nanoid |
| Déploiement (prévu) | **Docker** + **Caddy** (HTTPS auto) sur VPS |

Devise & langue : **MAD (dirham marocain)**, interface et e-mails en **français**. Modifiable dans [`src/lib/config.ts`](src/lib/config.ts) (`APP_CURRENCY`, `APP_LOCALE`, `APP_NAME`).

---

## 7. 🗂️ Structure du projet

```
src/
  app/
    (auth)/            connexion (login) + actions
    (app)/             zone connectée (cloisonnée par organisation)
      dashboard/       tableau de bord
      categories/      CRUD catégories
      products/        CRUD produits
      suppliers/       CRUD fournisseurs + association produits
      rfq/             demandes de prix (liste, création, détail, comparaison)
      purchase-orders/ bons de commande (liste, détail, PDF)
      settings/        réglages (à compléter)
    quote/[token]/     PORTAIL FOURNISSEUR public (saisie du devis via lien magique)
    api/auth/          routes Auth.js
  components/          composants UI (ui/ = shadcn ; po/, rfq/, quote/, ...)
  lib/                 db, auth, email, pdf, validators, config, helpers
  types/               types (augmentation Auth.js)
prisma/                schema.prisma, migrations, seed.ts
scripts/create-admin.ts   provisioning d'un client
docker-compose.yml     Postgres + Mailpit
```

---

## 8. ✅ Ce qui est FAIT

Le **workflow complet** décrit au départ est opérationnel et testé de bout en bout.

| Jalon | Contenu | État |
|---|---|---|
| **0** | Fondations : projet, design system, base de données, Docker, shell (sidebar) | ✅ |
| **1** | **Authentification** e-mail + mot de passe, **organisations** (multi-tenant), verrouillage (pas d'inscription publique, provisioning), en-têtes de sécurité, session 30 j, **anti-bruteforce** (verrouillage après 5 échecs) | ✅ |
| **2** | **Catalogue** : catégories + produits (CRUD complet, cloisonné) | ✅ |
| **3** | **Fournisseurs** : fiche complète + **association « qui fournit quoi »** | ✅ |
| **4** | **Demandes de prix (RFQ)** : sélection produits + fournisseurs éligibles, **envoi e-mail** avec **lien magique** unique par fournisseur | ✅ |
| **5** | **Devis** : **portail fournisseur** public (saisie prix/délai/conditions) + **saisie manuelle** côté acheteur | ✅ |
| **6** | **Comparaison** des devis côte à côte (meilleur prix/total/délai mis en évidence) + **choix du gagnant** | ✅ |
| **7** | **Bon de commande** : génération depuis le devis retenu → **PDF** → **envoi au fournisseur** → suivi de statut (brouillon/envoyé/confirmé/reçu/annulé) | ✅ |

**Améliorations récentes :**
- 💱 Devise passée en **MAD**.
- 🐛 Correctif : chaque fournisseur ne voit/cote **que les produits qu'il fournit**.
- ✉️ **Bouton « E-mail »** par fournisseur (sur le détail d'une demande) : génère le message générique prêt (objet + corps + lien magique), avec **Copier** et **Ouvrir dans ma messagerie** (mailto pré-rempli). Très utile tant qu'aucun SMTP n'est configuré.

---

## 9. 🧬 Modèle de données (résumé)

```
Organization ──┬── Membership (User, rôle: ADMIN/BUYER/VIEWER)
               ├── Category ── Product (nom, unité, qté, référence, description)
               ├── Supplier (contact, e-mail, tél, adresse, conditions paiement, notes)
               │     └── SupplierProduct  (qui fournit quoi)
               ├── Rfq (référence, statut, date limite)
               │     ├── RfqItem (produit, quantité)
               │     └── RfqRecipient (fournisseur, token 🔑, statut)
               │            └── Quote (délai, paiement, port, validité, statut)
               │                  └── QuoteItem (produit, prix unitaire, qté mini)
               └── PurchaseOrder (référence, fournisseur, statut, total, PDF)
                     └── POItem (produit, quantité, prix unitaire)
```

---

## 10. 🚧 Ce qui MANQUE / reste à faire

**Fonctionnalités (au-delà du périmètre initial) :**
- ⬜ **Jalon 8** — Tableau de bord enrichi : dépenses par fournisseur, **historique de prix** par produit, économies réalisées, notifications.
- ⬜ **Jalon 9** — **Mise en ligne sur le VPS** : une instance Docker + une base + un sous-domaine par client, HTTPS automatique (Caddy), sauvegardes.

**Sécurité / comptes (durcissement restant) :**
- ⬜ **Invitations d'équipe** : l'admin d'un client invite ses collègues par e-mail.
- ⬜ **2FA (double authentification)** optionnelle (code TOTP) — décidée « désactivée par défaut ».
- ⬜ **Mot de passe oublié** (réinitialisation par e-mail) — nécessite l'e-mail configuré.
- ⬜ **Journal d'audit** (qui se connecte, qui fait quoi).
- ⬜ **Sauvegardes chiffrées** de la base.

**Infrastructure / e-mail (ton seul vrai manque aujourd'hui) :**
- ⬜ **Nom de domaine** (~10 €/an) pointant vers le VPS.
- ⬜ **Service SMTP** d'envoi + enregistrements **SPF / DKIM / DMARC** (sinon les e-mails partent en spam). En attendant, le **bouton « E-mail » (copier/coller)** permet d'envoyer manuellement.

**Page Réglages** (`/settings`) : encore un écran « à venir » (gestion organisation, équipe, config e-mail).

---

## 11. 🔒 Sécurité — état actuel

Déjà en place :
- Connexion par mot de passe **haché (bcrypt)**.
- **Cloisonnement strict** : chaque requête filtre par l'organisation de l'utilisateur ; impossible de voir/modifier les données d'un autre client.
- **Anti-bruteforce** : 5 tentatives échouées → compte verrouillé 15 min.
- **En-têtes de sécurité** HTTP (X-Frame-Options, nosniff, Referrer-Policy, HSTS…).
- **Aucune inscription publique** ; comptes créés uniquement par provisioning.
- Portail fournisseur protégé par **token secret** (lien magique non devinable).

À faire avant la prod : voir §10 (2FA, mot de passe oublié, audit) et §12.

---

## 12. ⚠️ À FAIRE avant la mise en production

1. **Régénérer `AUTH_SECRET`** : `npx auth secret` → mettre la valeur dans le `.env` du serveur.
2. **Changer le mot de passe PostgreSQL** (`postgres`/`postgres` → un mot de passe fort) dans `docker-compose.yml` et `DATABASE_URL`.
3. Définir **`APP_URL`** sur l'URL réelle (ex. `https://client.tondomaine.com`) — utilisée dans les liens magiques des e-mails.
4. Configurer un **SMTP réel** (`SMTP_HOST/PORT/USER/PASS`) + **SPF/DKIM/DMARC**.
5. Ne **jamais** committer le fichier `.env` (déjà ignoré par git).
6. Activer **HTTPS** (Caddy) — voir §13.

---

## 13. 🌐 Déploiement VPS (plan)

Modèle retenu : **une instance par client** (isolation maximale).

- **Docker Compose** par client : un conteneur app + un conteneur Postgres + un volume de données, sur le VPS.
- **Caddy** en reverse proxy : HTTPS automatique (Let's Encrypt), un **sous-domaine par client** (`client1.tondomaine.com`, `client2…`).
- Pour chaque nouveau client : déployer l'instance → lancer `npm run create:admin` pour créer son admin → lui communiquer l'URL + identifiants.
- Prévoir des **sauvegardes** régulières (et chiffrées) des bases.

*(Les fichiers de déploiement — Dockerfile, Caddyfile, compose de prod — seront créés au Jalon 9.)*

---

## 14. 🧩 Pièges connus / notes

- **pdf-lib** n'encode que le Latin-1 : les textes du PDF sont nettoyés des caractères exotiques ; les montants sont formatés manuellement (`94,40 MAD`).
- **Comparaison de devis** : si une demande mélange des produits que tous les fournisseurs ne couvrent pas, chacun ne cote que les siens. La comparaison se fait alors **ligne par ligne** (un « — » apparaît pour un produit non fourni) ; le « meilleur total » reste **indicatif** car les paniers peuvent différer.
- **Devise** : tout passe par `APP_CURRENCY` dans `src/lib/config.ts` — un seul endroit à changer.

---

## 15. 🌿 État Git

Branche : `master`.

| Commit | Contenu |
|---|---|
| `cd93fcb` | Jalon 0 — fondations |
| `b2c0217` | Jalon 1 — auth + verrouillage + connexion facile |
| `c0c06bd` | Jalon 2 — catalogue |
| `03bb9f2` | Jalon 3 — fournisseurs |
| `b6713b7` | Jalon 4 — demandes de prix + e-mails |
| `1ddd769` | Jalon 5 — saisie des devis |
| `57ae36a` | Jalon 6 — comparaison |

⚠️ **Non encore commité** : Jalon 7 (bon de commande), passage en MAD, correctif « produits par fournisseur », bouton « E-mail » manuel, et cette documentation.
```
