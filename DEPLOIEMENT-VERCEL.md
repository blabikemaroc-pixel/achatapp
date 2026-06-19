# 🚀 Déploiement gratuit sur Vercel + Neon

100% gratuit, **sans carte bancaire**, pour toujours.

| Brique | Service | Coût |
|---|---|---|
| Hébergement | **Vercel** (Hobby) | Gratuit, sans carte |
| Base de données | **Neon** | Gratuit (déjà créée) |
| Fichiers (logos, factures…) | Stockés en base Neon | Gratuit |

> ⚠️ Limite Vercel gratuit : un fichier uploadé ne doit pas dépasser **~4,5 Mo** (suffisant pour logos et scans normaux ; au besoin, compresser un PDF lourd).

---

## 1. Importer le projet sur Vercel

1. Va sur **https://vercel.com** → **Sign up** avec **GitHub** (aucune carte demandée).
2. Clique **Add New… → Project**.
3. Importe le dépôt **`blabikemaroc-pixel/achatapp`**.
4. Vercel détecte automatiquement **Next.js**. Ne change rien à la détection.

## 2. Variables d'environnement (avant de déployer)

Déplie **Environment Variables** et ajoute :

| Nom | Valeur |
|---|---|
| `DATABASE_URL` | ta connection string **Neon** (avec `?sslmode=require`) |
| `AUTH_SECRET` | le secret généré (voir ci-dessous) |

> `APP_URL` et `AUTH_URL` seront ajoutées **après** le 1er déploiement (quand tu connaîtras ton URL).

Puis clique **Deploy**. Le build applique automatiquement les migrations Prisma → toutes les tables sont créées sur Neon.

## 3. Renseigner l'URL publique

Quand le déploiement est terminé, Vercel te donne une URL (ex. `https://achatapp.vercel.app`).

1. Va dans **Settings → Environment Variables** et ajoute :
   - `APP_URL` = ton URL Vercel
   - `AUTH_URL` = la même valeur
2. Onglet **Deployments** → bouton **⋯** du dernier déploiement → **Redeploy**.

> Important pour les **liens magiques** des e-mails fournisseurs : sans `APP_URL` correcte, les liens seraient faux.

## 4. Créer ton compte admin

Depuis **ta machine** (les tables existent maintenant sur Neon) :

```powershell
$env:DATABASE_URL="<ta connection string Neon>"
npm run create:admin -- --email ton@email.com --password "TonMotDePasseFort" --org "Ta Société" --name "Ton Nom"
```

Connecte-toi ensuite sur `https://achatapp.vercel.app/login`. Tu pourras changer ton mot de passe dans **Réglages**.

## 5. (Optionnel) E-mails automatiques — Brevo

Sans ça, l'app marche avec le bouton « copier/coller ». Pour l'envoi auto gratuit, ajoute dans **Settings → Environment Variables** :

| Nom | Valeur (exemple Brevo) |
|---|---|
| `SMTP_HOST` | `smtp-relay.brevo.com` |
| `SMTP_PORT` | `587` |
| `SMTP_SECURE` | `false` |
| `SMTP_USER` | identifiant SMTP Brevo |
| `SMTP_PASS` | clé SMTP Brevo |
| `EMAIL_FROM` | `Devizo <ton-email@domaine.com>` |

Puis **Redeploy**.

---

## Migration future (le jour où tu as un budget)

Ton code (GitHub) et ta base (Neon) sont portables. Pour passer plus tard à un VPS + Coolify (contrôle total, pas de limite d'upload), tu réutilises le `Dockerfile` et le `docker-compose.prod.yml` déjà présents — sans rien reconstruire.
