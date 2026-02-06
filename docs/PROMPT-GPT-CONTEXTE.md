# Prompt à coller dans GPT pour le contexte Nothly

Copie-colle le bloc ci-dessous en début de conversation avec ChatGPT (ou autre GPT) pour lui donner le contexte du projet. Tu peux ajouter ta question juste après.

---

**Contexte projet — Nothly**

Tu m’aides sur le projet **Nothly**, une app web de notes intelligentes avec IA (Next.js 14, React, TypeScript).

- **Stack** : Next.js 14 (App Router), React 18, TypeScript, Supabase (auth + BDD), Tailwind, Radix UI, React Query, OpenAI, Stripe, Google Cloud Storage (PDF).
- **Structure** : `app/` (pages et API), `components/`, `lib/` (hooks, auth, storage, IA), `messages/` (i18n fr/en).
- **Auth** : Supabase (email/mot de passe, magic link, callback OAuth dans `app/auth/callback`).
- **Principaux flux** : Landing → Login/Register → Workspace (Dashboard, Sujets, Quiz, Favoris, Calendrier). Un **sujet** = une matière ; dedans : documents PDF, notes, flashcards, quiz, résumés IA, chat IA. Tutoriel interactif global (steps avec `data-tutorial`, `TutorialProvider`, séquence jusqu’à l’étape « Raccourcis »).
- **Doc des routes** : voir `docs/ROUTES.md` pour tous les chemins (pages + API).
- **En cas d’erreur OpenSSL** `1E08010C:DECODER routines::unsupported` (Node 17+) : voir `docs/GCS-CONFIG.md`. Utiliser `GOOGLE_APPLICATION_CREDENTIALS` (fichier) ou `npm run dev:legacy`.

Réponds en français sauf si je demande en anglais. Pour le code, respecte le style du projet (composants dans `components/`, logique dans `lib/`, chemins d’API sous `app/api/`).

---

**Ma question :** [écris ici ce que tu veux faire ou le bug à résoudre]
