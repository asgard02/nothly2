# 🔧 Fix : Erreur "Missing script: dev"

## 🐛 Problème

```bash
npm run dev
# npm error Missing script: "dev"
```

## 💡 Causes possibles

1. **Cache npm corrompu**
2. **node_modules endommagé**
3. **Mauvaise installation des dépendances**
4. **Fichiers lock corrompus**

## ✅ Solution appliquée

### 1. Nettoyage complet

```bash
# Supprimer tous les fichiers de cache
rm -rf node_modules package-lock.json .next
```

### 2. Réinstallation propre

```bash
# Réinstaller toutes les dépendances
npm install
```

### 3. Lancer le serveur

```bash
# Démarrer Next.js
npm run dev
```

## 🚀 Procédure complète (si ça se reproduit)

```bash
# 1. Arrêter le serveur s'il tourne
# Ctrl+C dans le terminal

# 2. Nettoyer
cd /Users/macbookmae/Desktop/jsp
rm -rf node_modules package-lock.json .next

# 3. Réinstaller
npm install

# 4. Relancer
npm run dev
```

## 📝 Scripts disponibles

Dans `package.json`, vous avez :

```json
"scripts": {
  "dev": "next dev",          // Mode développement
  "build": "next build",       // Build production
  "start": "next start",       // Serveur production
  "lint": "next lint"          // Vérifier le code
}
```

## 🔍 Vérification

Pour voir les scripts disponibles :

```bash
npm run
```

## ⚠️ Warnings après installation

Vous pouvez ignorer ces warnings pour l'instant :

```
npm warn deprecated @supabase/auth-helpers-nextjs@0.8.7
# → Migration vers @supabase/ssr recommandée (pas urgent)

1 critical severity vulnerability
# → Exécuter npm audit fix si nécessaire
```

## 🎯 Prévention

### Bonnes pratiques

1. **Ne jamais modifier node_modules manuellement**
2. **Commiter package-lock.json** (assure la cohérence)
3. **Nettoyer régulièrement** le cache :
   ```bash
   npm cache clean --force
   ```
4. **Utiliser la même version de Node** dans l'équipe

### Si le problème persiste

1. Vérifier la version de Node.js :
   ```bash
   node --version  # Devrait être >= 18.x
   ```

2. Vérifier la version de npm :
   ```bash
   npm --version   # Devrait être >= 9.x
   ```

3. Mettre à jour npm si nécessaire :
   ```bash
   npm install -g npm@latest
   ```

## ✨ Commandes utiles

```bash
# Voir les versions installées
npm list --depth=0

# Nettoyer le cache npm
npm cache clean --force

# Vérifier les problèmes
npm audit

# Corriger automatiquement
npm audit fix

# Build de production
npm run build

# Démarrer en production
npm run start
```

## 🎉 Résultat

Après ces étapes, votre serveur devrait démarrer sur :
- 🌐 **http://localhost:3000**

Tous les nouveaux composants fonctionnent :
- ✅ Chat IA
- ✅ Menu Outils IA
- ✅ Drag & drop
- ✅ Transformations de texte

---

**Problème résolu !** 🚀

