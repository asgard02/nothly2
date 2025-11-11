# 🔧 Guide de résolution : Stabilité de l'environnement de développement

## ✅ Modifications apportées

### 1. Scripts npm ajoutés

```bash
npm run clean        # Nettoie tous les caches (.next, .turbo, node_modules/.cache)
npm run dev:clean    # Nettoie et redémarre le serveur en mode dev
npm run type-check   # Vérifie les types TypeScript sans compiler
```

### 2. Configuration Next.js optimisée

Le fichier `next.config.js` a été amélioré avec :
- **HMR optimisé** : Polling et timeout configurés pour améliorer la stabilité
- **Optimisation des imports** : Packages lourds optimisés automatiquement
- **Headers de cache** : Prévention des problèmes de cache en développement

### 3. Structure vérifiée

✅ Toutes les pages dans `/app/` ont un `export default` valide
✅ Les alias TypeScript (`@/*`) sont correctement configurés
✅ Les caches sont maintenant ignorés par Git

---

## 🚨 Résolution des problèmes récurrents

### Problème 1 : "404 après changement de route"

**Cause probable** : Cache Next.js corrompu

**Solution** :
```bash
npm run clean
npm run dev
```

---

### Problème 2 : "missing required error components, refreshing..."

**Cause probable** : Hot reload qui a planté, cache invalide

**Solution** :
```bash
# 1. Arrêter le serveur (Ctrl+C)
npm run clean
npm run dev:clean
```

---

### Problème 3 : "Routes introuvables après hot reload"

**Cause probable** : Webpack/Next.js qui n'a pas détecté les changements

**Solutions** :

1. **Nettoyer et redémarrer** :
   ```bash
   npm run clean
   npm run dev
   ```

2. **Vérifier que les fichiers sont valides** :
   - Chaque route doit avoir un fichier `page.tsx`
   - Chaque `page.tsx` doit avoir un `export default`
   - Pas de syntaxe TypeScript invalide

3. **Vérifier les logs du terminal** :
   - Rechercher les erreurs de compilation
   - Vérifier les erreurs TypeScript

---

### Problème 4 : "Erreurs 500 après un certain temps"

**Cause probable** : Mémoire qui sature ou cache Supabase qui expire

**Solutions** :

1. **Redémarrer le serveur** :
   ```bash
   npm run dev:clean
   ```

2. **Vérifier les variables d'environnement** :
   ```bash
   # Vérifier que .env.local existe et contient :
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ```

3. **Vérifier les logs du middleware** :
   - Regarder les logs `[Middleware]` dans le terminal
   - Identifier les erreurs Supabase

---

## 🔍 Vérifications préventives

### Avant de commencer à travailler

```bash
# 1. Nettoyer les caches
npm run clean

# 2. Vérifier les types TypeScript
npm run type-check

# 3. Lancer en mode propre
npm run dev:clean
```

### Si un problème persiste

1. **Arrêter complètement le serveur** (Ctrl+C)
2. **Nettoyer** : `npm run clean`
3. **Vérifier les logs** dans le terminal
4. **Redémarrer** : `npm run dev:clean`

---

## 📋 Checklist de diagnostic

Quand vous rencontrez un problème 404 :

- [ ] Le serveur tourne-t-il ? (`npm run dev`)
- [ ] Y a-t-il des erreurs dans le terminal ?
- [ ] Le fichier `page.tsx` existe-t-il pour cette route ?
- [ ] Le fichier a-t-il un `export default` ?
- [ ] Y a-t-il des erreurs TypeScript ? (`npm run type-check`)
- [ ] Le cache est-il propre ? (`npm run clean`)

---

## 🛠️ Commandes utiles

```bash
# Nettoyer tout
npm run clean

# Dev avec nettoyage automatique
npm run dev:clean

# Vérifier les types
npm run type-check

# Linter
npm run lint

# Build de production (pour tester)
npm run build
```

---

## 💡 Conseils pour éviter les problèmes

1. **Redémarrer régulièrement** : Si vous travaillez longtemps, redémarrez le serveur toutes les heures
2. **Vérifier les logs** : Regardez toujours les erreurs dans le terminal
3. **Nettoyer avant les commits** : Utilisez `npm run clean` avant de commit
4. **Garder Next.js à jour** : `npm update next`

---

## 📝 Logs à surveiller

Quand vous lancez `npm run dev`, surveillez :

- ✅ `✓ Ready on http://localhost:3000` → Tout est OK
- ❌ `Error: EADDRINUSE` → Port déjà utilisé (tuer le processus)
- ❌ `Module not found` → Fichier manquant ou chemin incorrect
- ❌ `Type error` → Erreur TypeScript à corriger

---

**Dernière mise à jour** : Après optimisation de la configuration Next.js

