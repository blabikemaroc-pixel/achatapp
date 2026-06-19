# 🚀 Déploiement gratuit sur Render + Neon

Guide pas à pas pour mettre l'application en ligne **sans aucun frais**.

| Brique | Service | Coût |
|---|---|---|
| Hébergement de l'app | **Render** (Web Service, plan Free) | Gratuit |
| Base de données PostgreSQL | **Neon** (https://neon.tech) | Gratuit |
| Fichiers (logos, factures, preuves) | **Stockés dans la base** (rien à configurer) | Gratuit |
| E-mails (optionnel) | **Brevo** (300 e-mails/jour) | Gratuit |

> ⚠️ On n'utilise **pas** le PostgreSQL gratuit de Render : il est **supprimé après 30 jours**. Neon est gratuit et permanent.

---

## 1. Créer la base de données (Neon)

1. Va sur **https://neon.tech** → crée un compte gratuit.
2. Crée un projet (région **EU / Frankfurt** de préférence, proche du Maroc).
3. Dans **Dashboard → Connection string**, copie l'URL. Elle ressemble à :
   ```
   postgresql://user:password@ep-xxx.eu-central-1.aws.neon.tech/neondb?sslmode=require
   ```
4. **Garde cette URL de côté** : c'est ta `DATABASE_URL`.

---

## 2. Mettre le code sur GitHub

Render déploie depuis un dépôt Git.

```bash
git add .
git commit -m "Préparation déploiement"
# crée un dépôt sur github.com puis :
git remote add origin https://github.com/TON-COMPTE/achats.git
git push -u origin master
```

> Le fichier `.env` n'est **jamais** envoyé (il est dans `.gitignore`). Les secrets se mettent uniquement dans Render.

---

## 3. Créer le service sur Render

1. Va sur **https://render.com** → crée un compte (connecte ton GitHub).
2. Clique **New → Blueprint**, choisis ton dépôt. Render lit automatiquement le fichier **`render.yaml`** déjà présent.
3. Render crée le service web `achats`. Avant le 1er déploiement, renseigne les variables d'environnement (étape suivante).

---

## 4. Renseigner les variables d'environnement

Dans le service Render → onglet **Environment** :

| Variable | Valeur |
|---|---|
| `DATABASE_URL` | l'URL Neon de l'étape 1 |
| `APP_URL` | l'URL de ton service Render, ex. `https://achats.onrender.com` |
| `AUTH_URL` | **la même valeur** que `APP_URL` |
| `AUTH_SECRET` | *(généré automatiquement par Render — ne pas toucher)* |

> 💡 Tu ne connais l'URL Render (`https://….onrender.com`) qu'après la création du service. Renseigne `APP_URL`/`AUTH_URL` puis relance un déploiement (**Manual Deploy → Deploy latest commit**). C'est important : sans ça, les **liens magiques** des e-mails fournisseurs seraient faux.

Les variables `SMTP_*` et `EMAIL_FROM` sont **optionnelles** (voir étape 6). Sans elles, l'app marche : tu utilises le bouton **« E-mail »** (copier/coller) déjà présent dans l'app.

Le déploiement applique automatiquement les migrations Prisma (`migrate deploy` dans le build). La base Neon vide est donc construite toute seule.

---

## 5. Créer le premier compte (admin)

Il n'y a **pas d'inscription publique**. Crée le 1er compte **depuis ta machine**, en pointant sur la base Neon :

```bash
# Windows PowerShell — remplace l'URL par ta DATABASE_URL Neon
$env:DATABASE_URL="postgresql://user:password@ep-xxx.../neondb?sslmode=require"
npm run create:admin -- --email admin@client.com --password "MotDePasseFort" --org "Nom du client" --name "Nom Admin"
```

Tu peux ensuite te connecter sur `https://….onrender.com/login`.

---

## 6. (Optionnel) Envoi automatique des e-mails — Brevo

Sans SMTP, l'app fonctionne avec le bouton « copier/coller ». Pour un envoi automatique gratuit :

1. Crée un compte gratuit sur **https://www.brevo.com** (300 e-mails/jour).
2. Récupère tes identifiants SMTP (**SMTP & API → SMTP**).
3. Dans Render → Environment, ajoute :

| Variable | Valeur (exemple Brevo) |
|---|---|
| `SMTP_HOST` | `smtp-relay.brevo.com` |
| `SMTP_PORT` | `587` |
| `SMTP_SECURE` | `false` |
| `SMTP_USER` | ton identifiant SMTP Brevo |
| `SMTP_PASS` | ta clé SMTP Brevo |
| `EMAIL_FROM` | `Achats <ton-email-verifie@domaine.com>` |

> Pour éviter le spam, vérifie ton expéditeur dans Brevo (SPF/DKIM).

---

## 7. À savoir sur le plan gratuit Render

- 😴 **Mise en veille** : le service s'endort après **15 min** sans visite → le **premier accès** prend ~30-50 s (le temps de redémarrer). Ensuite c'est instantané. Acceptable pour une app interne utilisée ponctuellement.
- 🧠 512 Mo de RAM, build mensuel limité — largement suffisant ici.
- 💾 **Aucun fichier n'est perdu** : logos, factures, BL et preuves sont stockés dans la base Neon (pas sur le disque éphémère de Render). C'est la correction clé apportée.

### Astuce anti-veille (optionnel)
Si le délai du premier accès gêne, configure un « ping » gratuit toutes les 10 min via **https://cron-job.org** (gratuit) vers `https://….onrender.com/login`. Le service reste alors éveillé aux heures ouvrées.

---

## Récapitulatif des coûts : **0 €**

Tout le stack tient dans les offres gratuites. Le seul futur coût optionnel serait un **nom de domaine** (~10 €/an) si tu veux une adresse personnalisée au lieu de `…onrender.com`.
