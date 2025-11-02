# 🔧 Correction rapide pour Vercel

## ⚡ Solution en 1 commande

```bash
./fix-and-push.sh
```

Ce script va :
1. ✅ Vérifier et corriger tous les problèmes
2. ✅ Réinstaller les dépendances
3. ✅ Commit automatiquement
4. ✅ Push sur GitHub (Vercel rebuild automatique)

## 📋 Problèmes corrigés automatiquement

### 1. Nom du package
- ❌ `"notlhy"` → ✅ `"nothly"`

### 2. Dépendances dépréciées
- ❌ `@supabase/auth-helpers-nextjs` → ✅ Supprimé

### 3. Runtime Edge → Node.js
- ✅ `export const runtime = "nodejs"` ajouté dans `app/api/dev-login/route.ts`

### 4. Fonction mockLogin
- ✅ Vérifiée et créée si nécessaire dans `lib/auth.ts`

### 5. Configuration ESLint
- ✅ `.eslintrc.json` créé avec les bonnes règles

## 🚨 Si vous préférez faire manuellement

```bash
# 1. Exécuter les corrections
./fix-build.sh

# 2. Vérifier les changements
git status

# 3. Ajouter les fichiers
git add .

# 4. Commiter
git commit -m "fix: correct build issues for Vercel"

# 5. Pousser sur GitHub
git push
```

## ✅ Après le push

Vercel va automatiquement :
1. Détecter le nouveau commit
2. Relancer le build
3. Le déployer si le build réussit

Vous pouvez suivre le build sur : https://vercel.com/dashboard

## 🔍 Vérification rapide

Pour vérifier que tout est correct avant de push :

```bash
# Vérifier le nom
grep '"name"' package.json  # Doit afficher "nothly"

# Vérifier les dépendances
grep "auth-helpers" package.json  # Ne doit rien afficher

# Vérifier le runtime
grep "runtime.*nodejs" app/api/dev-login/route.ts  # Doit afficher la ligne

# Vérifier mockLogin
grep "export.*mockLogin" lib/auth.ts  # Doit afficher la ligne
```

## 📞 En cas de problème

Si le build échoue encore :
1. Consultez les logs sur Vercel
2. Vérifiez que tous les changements sont bien poussés
3. Videz le cache Vercel (Settings → Clear Build Cache)

