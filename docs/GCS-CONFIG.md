# Configuration Google Cloud Storage (GCS)

## Problème résolu : ERR_OSSL_UNSUPPORTED

L'erreur `error:1E08010C:DECODER routines::unsupported` (Node 17+ / OpenSSL 3) se produit lorsque les credentials GCP sont passées en JSON string via `GCP_SERVICE_ACCOUNT_KEY`. La solution : utiliser `GOOGLE_APPLICATION_CREDENTIALS` (chemin fichier) et l’auto-détection du SDK.

## Configuration locale

1. **Placer la clé JSON** du service account dans un fichier (ex. `./keys/gcp-nothly.json`).
2. **Définir la variable d’environnement** :
   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS="/chemin/absolu/vers/key.json"
   ```
   Ou dans `.env.local` :
   ```
   GOOGLE_APPLICATION_CREDENTIALS="/Users/vous/projet/nothly/keys/gcp-nothly.json"
   ```
3. **Variables requises** :
   - `GCP_PROJECT_ID` : ID du projet Google Cloud
   - `GCS_BUCKET` ou `GCP_STORAGE_BUCKET` : nom du bucket (ex. `nothly-storage`)

## Configuration Vercel

Sur Vercel, on ne peut pas utiliser un fichier statique. Utiliser **`GCP_SERVICE_ACCOUNT_KEY`** (JSON sur une ligne) : le runtime écrit la clé dans `/tmp` et définit `GOOGLE_APPLICATION_CREDENTIALS` avant d’initialiser le client GCS.

1. Dans Vercel → Settings → Environment Variables, ajouter :
   - `GCP_PROJECT_ID`
   - `GCS_BUCKET` ou `GCP_STORAGE_BUCKET`
   - `GCP_SERVICE_ACCOUNT_KEY` : coller le JSON complet du compte de service (une ligne)
2. Ne pas définir `GOOGLE_APPLICATION_CREDENTIALS` sur Vercel.

## Fallback dev:legacy (local)

Si l’erreur OpenSSL persiste en local malgré `GOOGLE_APPLICATION_CREDENTIALS` :

```bash
npm run dev:legacy    # démarre le serveur avec --openssl-legacy-provider
npm run build:legacy  # build avec legacy provider
npm run start:legacy  # production avec legacy provider
```

## Vérification Node.js sur Vercel

Vercel utilise Node 18 ou 20 par défaut. La config actuelle avec `GOOGLE_APPLICATION_CREDENTIALS` (fichier) évite en général l’erreur OpenSSL. Si besoin, définir `NODE_VERSION=18` ou `20` dans les variables d’environnement Vercel.

## Tests

```bash
# Vérifier la config GCS
npx tsx --env-file=.env.local scripts/test-storage-auth.ts

# Upload manuel (exemple)
curl -X POST http://localhost:3000/api/documents \
  -H "Cookie: ..." \
  -F "file=@test.pdf" \
  -F "tags=test"
```
