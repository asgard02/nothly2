# Récapitulatif : correction bug OpenSSL/GCS

## A) Audit réalisé

### Occurrences trouvées

| Fichier | Usage |
|---------|-------|
| `lib/storage.ts` | `getStorageOptions()` avec `JSON.parse(GCP_SERVICE_ACCOUNT_KEY)` → credentials passées à `new Storage(options)` → **source de l’erreur** |
| `app/api/documents/route.ts` | `ensureBucket()`, `getStorageBucket()` |
| `app/api/documents/[id]/route.ts` | `getStorageBucket` |
| `app/api/documents/[id]/pdf/route.ts` | `getStorageBucket` |
| `lib/documents/processor.ts` | `getStorageBucket` |
| `lib/collections/processor.ts` | `getStorageBucket` |
| `scripts/test-gcs.ts` | `new Storage({ credentials })` avec JSON.parse |
| `scripts/test-storage-auth.ts` | Utilise `lib/storage` |
| `scripts/cleanup-storage.ts`, `re-extract-pdf-text.ts`, `recalculate-pages.ts` | `getStorageBucket` |

### Cause

L’erreur `1E08010C:DECODER routines::unsupported` (ERR_OSSL_UNSUPPORTED) se produit lorsque le SDK Google Auth (gtoken → jwa → `crypto.Sign.sign`) utilise une clé privée fournie via un objet credentials passé à `new Storage()`. Le chemin `credentials: JSON.parse(env)` → objet passé au constructeur déclenche ce bug sous Node 17+ / OpenSSL 3.

## B) Fichiers modifiés / créés

| Action | Fichier |
|--------|---------|
| **Créé** | `lib/server/gcs.ts` – client GCS server-only avec `GOOGLE_APPLICATION_CREDENTIALS` |
| **Remplacé** | `lib/storage.ts` – délègue à `lib/server/gcs` |
| **Modifié** | `app/api/documents/route.ts` – import de `getBucket` depuis `lib/server/gcs`, gestion ERR_OSSL_UNSUPPORTED et stream destroyed |
| **Modifié** | `.env.example` – documentation GOOGLE_APPLICATION_CREDENTIALS / GCP_SERVICE_ACCOUNT_KEY |
| **Modifié** | `package.json` – dépendance `server-only` |
| **Créé** | `docs/GCS-CONFIG.md` – configuration GCS et déploiement |
| **Modifié** | `docs/PROMPT-GPT-CONTEXTE.md` – référence vers `docs/GCS-CONFIG.md` |

### Normalisation clé privée (OpenSSL 3)

Dans `lib/server/gcs.ts`, lorsque des credentials sont lus (fichier ou `GCP_SERVICE_ACCOUNT_KEY`) :
- les `\n` échappés dans `private_key` sont convertis en vrais retours à la ligne ;
- la clé est convertie en PKCS#8 si possible (évite `DECODER routines::unsupported` sous Node 17+ / OpenSSL 3).

## C) Configuration

### Local (recommandé)

```bash
# .env.local
GOOGLE_APPLICATION_CREDENTIALS="/chemin/absolu/vers/votre-key.json"
GCP_PROJECT_ID="helpdesk-476610"
GCS_BUCKET="nothly-storage"
```

### Vercel

Variables d’environnement à définir :
- `GCP_PROJECT_ID`
- `GCS_BUCKET` ou `GCP_STORAGE_BUCKET`
- `GCP_SERVICE_ACCOUNT_KEY` (JSON sur une ligne)

Le module `lib/server/gcs.ts` écrit la clé dans `/tmp` et définit `GOOGLE_APPLICATION_CREDENTIALS` au runtime si besoin.

### Scripts npm (fallback legacy)

```bash
npm run dev:legacy    # Node --openssl-legacy-provider
npm run build:legacy
npm run start:legacy
```

## D) Validation

1. **Config locale** : définir `GOOGLE_APPLICATION_CREDENTIALS` dans `.env.local`
2. **Lancer** : `npm run dev` (ou `npm run dev:legacy` si l’erreur persiste)
3. **Tester l’upload** : POST `/api/documents` avec un PDF
4. **Vérifier** : absence de l’erreur `ERR_OSSL_UNSUPPORTED` et upload réussi dans GCS

## Sécurité

- `lib/server/gcs.ts` importe `server-only` : erreur si import côté client
- `getBucket` / `getStorageBucket` ne sont importés que depuis : API routes, processors, scripts (serveur)
- La clé n’est jamais exposée côté client
