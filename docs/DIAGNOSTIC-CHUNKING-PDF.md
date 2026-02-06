# Diagnostic : Chunking PDF uniquement quand le PC est allumé

## Conclusion

**Cause racine** : Le chunking PDF est consommé par un **worker Node.js lancé en local** (`npm run worker:documents`). Aucun processus cloud ne poll la table `async_jobs`. Quand ton PC est éteint, les jobs restent en `pending` indéfiniment.

## Flux actuel

1. **Upload** : `POST /api/documents`  
   - Crée une ligne `documents` (status `processing`).  
   - Upload le fichier vers **GCS** (Google Cloud Storage).  
   - Insère un job dans **`async_jobs`** (`type: "document-generation"`, `status: "pending"`).

2. **Consommation** : **Uniquement** le script local  
   - `scripts/process-document-jobs.ts`  
   - Lancé via `npm run worker:documents` (tsx + .env.local).  
   - Boucle infinie : poll `async_jobs` (pending + type document-generation), claim (UPDATE pending → running), exécute `processDocumentGenerationJob()` dans `lib/documents/processor.ts`.

3. **Traitement** (`lib/documents/processor.ts`)  
   - Télécharge le PDF depuis **GCS** (ou utilise le texte déjà extrait en upload).  
   - Extraction texte (pdf-parse), découpe en sections, écriture `document_versions` + `document_sections`, mise à jour `documents.status` → `ready`.

## Ce qui a été vérifié

- **Aucun** appel à localhost/127.0.0.1/ngrok dans le flux PDF (uniquement dans .env.example, tests, Playwright, AIChat pour la reconnaissance vocale).  
- **Aucun** trigger Supabase (webhook / Storage) qui appelle une URL : le job est créé côté app, pas par la DB.  
- **Aucun** traitement PDF côté client : tout se fait côté serveur (API + worker).  
- Le **timeout** Vercel (60s) n’est pas en cause : le long travail est délégué au worker, pas à une route API.

## Pourquoi flashcards/quiz marchent sans ton PC

Ils passent par des **routes API Vercel** (et éventuellement OpenAI) : pas de worker local. Le chunking, lui, dépend d’un **processus qui tourne là où `npm run worker:documents` est exécuté** → aujourd’hui uniquement sur ta machine.

## Solution retenue (Option 1)

- **Garder** la table `async_jobs` et le flux actuel (upload → création de job → traitement).  
- **Déployer** le même worker (`process-document-jobs.ts`) sur un host cloud (Railway / Fly.io / Render) qui tourne 24/7 et poll `async_jobs`.  
- **Pas** de webhook ni de cron Supabase : un seul worker stateless, relançable, avec retries et logs.

Fichiers concernés :  
- Migration : `supabase-pdf-jobs-worker.sql` (colonnes utiles pour retries/observabilité).  
- Code : endpoint `GET /api/documents/[id]/status`, worker inchangé côté logique, Dockerfile + doc de déploiement.
