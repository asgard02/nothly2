# 🔧 Fix: Erreur de cache Next.js

## 🐛 Problème rencontré

```
Attempted import error: 'transformText' is not exported from '@/lib/ai'
Attempted import error: 'chatWithAI' is not exported from '@/lib/ai'
```

## 💡 Cause

Le problème était dû à un **conflit client/serveur** dans Next.js :
- `lib/ai.ts` contient du code serveur (initialisation OpenAI avec `process.env`)
- Les composants client (`dashboard-client.tsx`, `AIChat.tsx`) essayaient d'importer ces fonctions
- Next.js ne peut pas exécuter du code serveur dans des composants client

## ✅ Solution appliquée

### 1. Séparation des fichiers

**`lib/ai.ts`** (serveur uniquement)
```typescript
// Pour les API routes seulement
import OpenAI from "openai"
export async function improveNote(content: string) { ... }
```

**`lib/ai-client.ts`** (client - nouveau fichier)
```typescript
// Pour les composants React
export async function chatWithAI(message: string) { ... }
export async function transformText(text: string, mode: string) { ... }
```

### 2. Mise à jour des imports

- `dashboard-client.tsx` → `import { transformText } from "@/lib/ai-client"`
- `AIChat.tsx` → `import { chatWithAI } from "@/lib/ai-client"`
- `app/api/ai/improve/route.ts` → `import { improveNote } from "@/lib/ai"`

### 3. Nettoyage du cache

```bash
rm -rf .next
npm run dev
```

## 🎯 Architecture finale

```
lib/
├── ai.ts           → Serveur (API routes)
│   └── improveNote()
│
└── ai-client.ts    → Client (composants React)
    ├── chatWithAI()
    └── transformText()
```

## 🔄 Si le problème persiste

Si vous rencontrez toujours des erreurs d'import après modification de fichiers :

### 1. Arrêter le serveur
```bash
# Ctrl+C dans le terminal où tourne npm run dev
```

### 2. Supprimer le cache Next.js
```bash
rm -rf .next
```

### 3. Supprimer node_modules (optionnel, si vraiment bloqué)
```bash
rm -rf node_modules
npm install
```

### 4. Redémarrer
```bash
npm run dev
```

## 📝 Règle à retenir

**Dans Next.js 13+ avec App Router :**

- ✅ **Composants "use client"** → Ne peuvent importer que du code client
- ✅ **API Routes** → Peuvent utiliser du code serveur (OpenAI, DB, etc.)
- ✅ **Server Components** → Peuvent utiliser du code serveur directement

❌ **Ne jamais** importer du code serveur dans un composant client !

## 🚨 Signes d'un problème client/serveur

Si vous voyez ces erreurs :
- `process is not defined`
- `Cannot access 'process.env' in client component`
- `Module not found` ou `not exported` après modifications
- Erreurs de build mentionnant "client" et "server"

→ **Solution** : Séparez votre code client et serveur dans des fichiers différents

## ✨ Bonus : Vérification rapide

Pour savoir si un fichier peut être utilisé côté client :

1. Est-ce qu'il importe `"use client"` ?
2. Est-ce qu'il utilise des hooks React (useState, useEffect, etc.) ?
3. Est-ce qu'il accède au DOM (window, document) ?

Si **OUI** → C'est un fichier client → N'importez pas de code serveur

Si **NON** et il utilise :
- `process.env` (côté serveur)
- Imports Node.js (fs, path, crypto)
- Connexions DB directes

→ C'est un fichier serveur → Ne l'importez pas dans des composants client

## 🎉 Statut actuel

✅ **Cache nettoyé**  
✅ **Fichiers séparés correctement**  
✅ **Imports mis à jour**  
✅ **Serveur redémarré**  

Votre application devrait maintenant fonctionner sans erreur ! 🚀

