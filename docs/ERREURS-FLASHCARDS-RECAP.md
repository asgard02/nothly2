# 🔴 Récapitulatif des erreurs - Page Flashcards

**Date** : Session actuelle  
**Problème principal** : Erreur 404 en boucle lors de l'accès à `/flashcards/[collectionId]` après création d'une collection

---

## 📋 Contexte

### Ce qui a été fait
1. ✅ Refactorisation de `/app/flashcards/page.tsx` pour revenir à une **liste de collections uniquement**
2. ✅ Suppression du panneau de détail (Synthèse/Flashcards/Quiz) de la page principale
3. ✅ Redirection vers `/flashcards/[collectionId]` lors du clic sur une collection
4. ✅ Correction du message i18n mal formaté dans `messages/fr.json` et `messages/en.json` (`{{title}}` → `{title}`)

### Structure actuelle
- `/app/flashcards/page.tsx` → Liste des collections (création + affichage)
- `/app/flashcards/[collectionId]/page.tsx` → Page d'étude détaillée (Flashcards + Quiz)
- `/app/flashcards/[collectionId]/SidebarPanel.tsx` → Sidebar de navigation

---

## 🚨 Erreurs rencontrées

### 1. Erreur principale : Module vendor-chunks manquant

**Erreur** :
```
Error: Cannot find module './vendor-chunks/@tanstack.js'
Require stack:
- /Users/macbookmae/Desktop/note_fi/.next/server/webpack-runtime.js
- /Users/macbookmae/Desktop/note_fi/.next/server/app/flashcards/[collectionId]/page.js
```

**Quand ça arrive** :
- Après création d'une nouvelle collection
- Lors du clic sur une collection pour accéder à `/flashcards/[collectionId]`
- Erreur 404 en boucle dans la console du navigateur

**Fréquence** : **Systématique** après chaque création de collection

---

### 2. Erreurs secondaires (warnings webpack)

**Warnings observés dans le terminal** :
```
[webpack.cache.PackFileCacheStrategy] Caching failed for pack: 
Error: ENOENT: no such file or directory, lstat '/Users/macbookmae/Desktop/note_fi/.next/server/vendor-chunks/clsx.js'

[webpack.cache.PackFileCacheStrategy/webpack.FileSystemInfo] Resolving './vendor-chunks/class-variance-authority' 
... doesn't lead to expected result

[webpack.cache.PackFileCacheStrategy/webpack.FileSystemInfo] Resolving './vendor-chunks/next-themes'
... doesn't lead to expected result

[webpack.cache.PackFileCacheStrategy/webpack.FileSystemInfo] Resolving './vendor-chunks/next-intl'
... doesn't lead to expected result

[webpack.cache.PackFileCacheStrategy/webpack.FileSystemInfo] Resolving './vendor-chunks/lucide-react'
... doesn't lead to expected result
```

**Autre erreur** :
```
TypeError: Cannot read properties of undefined (reading 'clientModules')
at /Users/macbookmae/Desktop/note_fi/node_modules/next/dist/compiled/next-server/app-page.runtime.dev.js:39:25703
```

---

### 3. Erreur i18n (corrigée)

**Erreur initiale** :
```
IntlError: INVALID_MESSAGE: MALFORMED_ARGUMENT 
(Es-tu sûr de vouloir supprimer <bold>{{title}}</bold> ? Cette action est irréversible.)
```

**Solution appliquée** : Correction dans `messages/fr.json` et `messages/en.json` :
- `{{title}}` → `{title}` (FormatJS attend `{variable}` et non `{{variable}}`)

**Status** : ✅ **Résolu**

---

## 🔧 Tentatives de résolution

### 1. Nettoyage des caches
```bash
npm run clean  # Supprime .next, .turbo, node_modules/.cache
npm run dev
```
**Résultat** : Erreur persiste après quelques requêtes

### 2. Redémarrage complet
- Kill de tous les processus sur les ports 3000-3003
- Nettoyage complet
- Redémarrage du serveur

**Résultat** : L'erreur revient systématiquement lors de l'accès à `/flashcards/[collectionId]`

### 3. Vérification de la compilation
- Les routes compilent correctement (`✓ Compiled /flashcards/[collectionId]`)
- Les API répondent en 200 (`GET /api/collections/{id} 200`)
- Mais l'erreur survient lors du **rendu serveur** de la page

---

## 🔍 Analyse

### Problème identifié
Le problème semble lié à la **génération des vendor-chunks par Webpack** dans Next.js 14.2.33. Les modules vendor ne sont pas correctement générés ou référencés pour la route dynamique `/flashcards/[collectionId]`.

### Packages concernés
- `@tanstack/react-query` (et dépendances)
- `clsx`
- `class-variance-authority`
- `next-themes`
- `next-intl`
- `lucide-react`

### Hypothèses
1. **Problème de configuration Webpack** : Les vendor-chunks ne sont pas correctement configurés pour les routes dynamiques
2. **Problème de cache corrompu** : Le cache webpack est corrompu et ne se régénère pas correctement
3. **Problème de version Next.js** : Next.js 14.2.33 pourrait avoir un bug avec la génération des vendor-chunks
4. **Problème d'imports** : Des imports côté serveur qui ne devraient pas être là

---

## 📝 État actuel

### Ce qui fonctionne
- ✅ Page `/flashcards` (liste des collections)
- ✅ API `/api/collections` (GET et POST)
- ✅ API `/api/collections/[id]`
- ✅ Compilation des routes
- ✅ Correction i18n

### Ce qui ne fonctionne pas
- ❌ Accès à `/flashcards/[collectionId]` → Erreur 404 avec `Cannot find module './vendor-chunks/@tanstack.js'`
- ❌ Erreur se produit **systématiquement** après création d'une collection

---

## 🎯 Pistes à explorer

### 1. Vérifier les imports dans `/app/flashcards/[collectionId]/page.tsx`
- S'assurer qu'aucun import client-only n'est utilisé côté serveur
- Vérifier l'utilisation de `@tanstack/react-query` (doit être dans un composant client)

### 2. Configuration Next.js
- Vérifier si `optimizePackageImports` dans `next.config.js` cause des problèmes
- Tester avec/sans configuration webpack personnalisée

### 3. Mise à jour Next.js
- Next.js 14.2.33 est marqué comme "outdated" dans l'erreur
- Tester avec une version plus récente (14.2.x latest ou 15.x)

### 4. Alternative : Désactiver les vendor-chunks
- Forcer Next.js à ne pas utiliser les vendor-chunks pour cette route
- Ou utiliser une configuration webpack pour exclure certains packages

### 5. Vérifier le middleware
- Le middleware pourrait interférer avec les routes dynamiques
- Tester en désactivant temporairement le middleware

---

## 📦 Informations techniques

### Versions
- Next.js : 14.2.33
- React : 18.2.0
- @tanstack/react-query : 5.90.6
- Node.js : (version à vérifier)

### Structure de fichiers
```
app/
  flashcards/
    page.tsx                    # Liste des collections ✅
    [collectionId]/
      page.tsx                  # Page d'étude ❌ (erreur ici)
      SidebarPanel.tsx          # Sidebar
```

### Configuration
- `next.config.js` : Utilise `next-intl` plugin
- `middleware.ts` : Gère l'authentification et les routes protégées
- Mode : Développement (`npm run dev`)

---

## 🚀 Actions recommandées pour un nouveau chat

1. **Lire ce document** pour comprendre le contexte
2. **Vérifier les imports** dans `/app/flashcards/[collectionId]/page.tsx`
3. **Examiner la configuration webpack** dans `next.config.js`
4. **Tester une solution de contournement** (ex: désactiver vendor-chunks temporairement)
5. **Considérer une mise à jour Next.js** si nécessaire

---

## ✅ Corrections appliquées

### 1. Configuration Next.js (`next.config.js`)
- ✅ **Désactivation de `optimizePackageImports`** : Commentée temporairement pour éviter les problèmes de vendor-chunks
- ✅ **Configuration webpack améliorée** : Ajout de fallbacks et optimisation des splitChunks pour mieux gérer les vendor-chunks
- ✅ **Résolution des modules** : Ajout de fallbacks pour `fs`, `net`, `tls` côté client

### 2. ReactQueryProvider (`lib/react-query-provider.tsx`)
- ✅ **Désactivation temporaire de la persistance** : Les imports dynamiques de `@tanstack/react-query-persist-client` et `@tanstack/query-sync-storage-persister` ont été commentés pour éviter les problèmes de vendor-chunks
- ✅ **Nettoyage des imports** : Suppression de l'import `useEffect` non utilisé

### 3. Page Flashcards (`app/flashcards/[collectionId]/page.tsx`)
- ✅ **Vérification des imports** : Tous les imports sont correctement marqués comme client-side (`"use client"`)
- ✅ **Pas d'imports problématiques** : Aucun import serveur-side détecté

### Prochaines étapes pour tester
1. Nettoyer les caches : `npm run clean`
2. Redémarrer le serveur de développement : `npm run dev`
3. Tester la création d'une collection et l'accès à `/flashcards/[collectionId]`
4. Si le problème persiste, considérer une mise à jour de Next.js vers une version plus récente

---

## 📌 Notes importantes

- L'erreur est **systématique** et **reproductible**
- Elle survient uniquement sur la route dynamique `/flashcards/[collectionId]`
- Les autres routes fonctionnent correctement
- Le problème semble lié à la génération des vendor-chunks par Webpack
- Le nettoyage des caches ne résout pas le problème de manière permanente
- **Corrections appliquées** : Configuration Next.js et ReactQueryProvider modifiées pour éviter les problèmes de vendor-chunks

---

**Dernière mise à jour** : Session actuelle - Corrections appliquées

