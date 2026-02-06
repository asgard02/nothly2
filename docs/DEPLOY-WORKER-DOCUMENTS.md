# Déploiement du worker document (chunking PDF)

Ce worker consomme les jobs `document-generation` dans la table `async_jobs`. Il doit tourner **en continu** (Railway, Fly.io, Render) pour que le chunking PDF fonctionne sans ton PC.

## Variables d’environnement

À configurer sur la plateforme (secrets / env) :

| Variable | Obligatoire | Description |
|----------|-------------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Oui | URL du projet Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Oui | Clé service role (pas anon) |
| `GCP_PROJECT_ID` | Oui | ID du projet Google Cloud |
| `GCP_STORAGE_BUCKET` | Oui | Nom du bucket GCS où sont stockés les PDF |
| `GCP_SERVICE_ACCOUNT_KEY` | Oui | JSON du compte de service GCP (une ligne ou base64) |
| `JOB_POLL_INTERVAL_MS` | Non | Intervalle de poll en ms (défaut 2000) |

Optionnel (email après traitement) :

- `APP_URL` ou `NEXT_PUBLIC_APP_URL` : URL de l’app (ex. https://nothly.vercel.app)
- Config SMTP / SendGrid si `sendDeckReadyEmail` est utilisé

## Option 1 : Railway

1. Créer un projet → **Deploy from GitHub** (ou Dockerfile).
2. **Root Directory** : la racine du repo.
3. **Dockerfile path** : `Dockerfile.worker-documents`.
4. Ajouter les variables d’env ci‑dessus dans **Variables**.
5. Déployer. Le worker tourne en continu.

## Option 2 : Fly.io

```bash
# Depuis la racine du repo
fly launch --no-deploy --name nothly-worker-docs --dockerfile Dockerfile.worker-documents
fly secrets set NEXT_PUBLIC_SUPABASE_URL="..." SUPABASE_SERVICE_ROLE_KEY="..." GCP_PROJECT_ID="..." GCP_STORAGE_BUCKET="..." GCP_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'
fly deploy
```

## Option 3 : Render

1. **New → Background Worker**.
2. Connecter le repo.
3. **Build Command** : (vide, image Docker) ou laisser Render builder avec le Dockerfile.
4. **Dockerfile path** : `Dockerfile.worker-documents`.
5. **Env** : ajouter toutes les variables listées plus haut.
6. Déployer.

## Vérification

- En prod : upload un PDF, vérifier que le document passe de `processing` à `ready`.
- Logs du worker : messages `[process-document-jobs]` (job started, succeeded, failed).
- Table `async_jobs` : jobs `document-generation` passent de `pending` → `running` → `succeeded` (ou `failed`).

## Migration SQL (optionnel)

Pour ajouter une colonne `attempts` sur `async_jobs` (retries) :

```bash
# Dans l’éditeur SQL Supabase
psql / Supabase SQL Editor : exécuter supabase-pdf-jobs-worker.sql
```

## Mode dev local

Comme avant : lancer le worker en local pour tester sans déployer.

```bash
npm run worker:documents
```

(Utilise `.env.local` ; la prod utilise les variables de la plateforme.)
