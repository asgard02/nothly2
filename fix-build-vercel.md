# 🔧 Guide de correction automatique du build Vercel

## ⚡ Correction rapide

Exécutez simplement le script de correction :

```bash
./fix-build.sh
```

## 📋 Ce que le script corrige automatiquement

### 1. ✅ Nom du package
- Vérifie et corrige `"notlhy"` → `"nothly"` dans `package.json`

### 2. ✅ Dépendances Supabase
- Supprime `@supabase/auth-helpers-nextjs` (déprécié)
- Vérifie la présence de `@supabase/ssr` (officiel)

### 3. ✅ Runtime Node.js
- Ajoute `export const runtime = "nodejs"` dans `app/api/dev-login/route.ts`
- Nécessaire pour que Supabase fonctionne correctement

### 4. ✅ Fonction mockLogin
- Vérifie l'existence de `mockLogin` dans `lib/auth.ts`
- Crée le fichier et la fonction si nécessaire

### 5. ✅ Configuration ESLint
- Crée `.eslintrc.json` avec les règles appropriées

### 6. ✅ Nettoyage
- Supprime `node_modules` et `package-lock.json`
- Réinstalle toutes les dépendances

## 🚀 Après l'exécution du script

```bash
# 1. Vérifier les changements
git status

# 2. Ajouter tous les fichiers modifiés
git add .

# 3. Commiter
git commit -m "fix: correct build issues for Vercel"

# 4. Pousser sur GitHub
git push
```

## 🔍 Vérifications manuelles

Si vous préférez vérifier manuellement, voici ce qui doit être correct :

### `package.json`
```json
{
  "name": "nothly",  // ✅ Pas "notlhy"
  "dependencies": {
    "@supabase/ssr": "^0.7.0",  // ✅ Présent
    // ❌ Pas de "@supabase/auth-helpers-nextjs"
  }
}
```

### `app/api/dev-login/route.ts`
```typescript
import { mockLogin } from "@/lib/auth"

// ✅ Cette ligne doit être présente
export const runtime = "nodejs"

// ... reste du code
```

### `lib/auth.ts`
```typescript
// ✅ Cette fonction doit être exportée
export async function mockLogin(email: string): Promise<User> {
  // ... implémentation
}
```

## ❌ Erreurs courantes sur Vercel

### "mockLogin is not exported"
➡️ Vérifiez que `lib/auth.ts` exporte bien `mockLogin`

### "Node.js API is not supported in Edge Runtime"
➡️ Ajoutez `export const runtime = "nodejs"` dans vos routes API qui utilisent Supabase

### "Package deprecated warnings"
➡️ Supprimez `@supabase/auth-helpers-nextjs` de `package.json`

### Nom du package incorrect
➡️ Vérifiez que `package.json` contient `"name": "nothly"` (pas "notlhy")

## 📞 Support

Si le build échoue toujours après avoir exécuté le script :
1. Vérifiez les logs de build sur Vercel
2. Assurez-vous que tous les changements sont commités et poussés
3. Vérifiez que le cache Vercel est vidé (option dans les settings du projet)

