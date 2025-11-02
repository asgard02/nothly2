#!/bin/bash

# Script de correction automatique pour le build Vercel
# Ce script vérifie et corrige les problèmes courants

set -e

echo "🔧 Correction du build Vercel..."
echo ""

# 1. Vérifier et corriger le nom du package
echo "📦 1. Vérification du nom du package..."
if grep -q '"name": "notlhy"' package.json; then
    echo "   ⚠️  Nom incorrect trouvé, correction..."
    sed -i '' 's/"name": "notlhy"/"name": "nothly"/' package.json
    echo "   ✅ Nom corrigé: notlhy → nothly"
else
    echo "   ✅ Nom correct (nothly)"
fi

# 2. Vérifier et supprimer les dépendances dépréciées
echo ""
echo "📦 2. Vérification des dépendances Supabase..."
if grep -q "@supabase/auth-helpers-nextjs" package.json; then
    echo "   ⚠️  Dépendance dépréciée trouvée, suppression..."
    sed -i '' '/@supabase\/auth-helpers-nextjs/d' package.json
    echo "   ✅ @supabase/auth-helpers-nextjs supprimé"
else
    echo "   ✅ Aucune dépendance dépréciée trouvée"
fi

# 3. Vérifier que @supabase/ssr est présent
if ! grep -q "@supabase/ssr" package.json; then
    echo "   ⚠️  @supabase/ssr manquant, ajout..."
    # Cette partie nécessiterait une manipulation JSON plus complexe
    echo "   ⚠️  Veuillez ajouter manuellement @supabase/ssr si nécessaire"
else
    echo "   ✅ @supabase/ssr présent"
fi

# 4. Vérifier et ajouter runtime Node.js dans dev-login
echo ""
echo "🔧 3. Vérification de la route dev-login..."
DEV_LOGIN_FILE="app/api/dev-login/route.ts"
if [ -f "$DEV_LOGIN_FILE" ]; then
    if ! grep -q "export const runtime = \"nodejs\"" "$DEV_LOGIN_FILE"; then
        echo "   ⚠️  Runtime Node.js manquant, ajout..."
        # Ajouter après les imports
        sed -i '' '/^import.*from/a\
\
// Force le runtime Node.js pour cette route (nécessaire pour Supabase)\
export const runtime = "nodejs"
' "$DEV_LOGIN_FILE"
        echo "   ✅ Runtime Node.js ajouté"
    else
        echo "   ✅ Runtime Node.js déjà présent"
    fi
else
    echo "   ⚠️  Fichier dev-login/route.ts non trouvé"
fi

# 5. Vérifier que mockLogin existe dans lib/auth.ts
echo ""
echo "🔧 4. Vérification de mockLogin..."
AUTH_FILE="lib/auth.ts"
if [ -f "$AUTH_FILE" ]; then
    if ! grep -q "export.*mockLogin" "$AUTH_FILE"; then
        echo "   ⚠️  mockLogin manquant, ajout..."
        cat >> "$AUTH_FILE" << 'EOF'

// Fonction de connexion mock pour l'environnement de développement
export async function mockLogin(email: string) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('mockLogin ne peut être utilisé qu\'en développement')
  }

  // Simulation d'un utilisateur pour le mode dev
  return {
    id: `dev-${Date.now()}`,
    email: email.toLowerCase().trim(),
    role: 'free' as const,
    created_at: new Date().toISOString(),
  }
}
EOF
        echo "   ✅ mockLogin ajouté"
    else
        echo "   ✅ mockLogin déjà présent"
    fi
else
    echo "   ⚠️  Fichier lib/auth.ts non trouvé, création..."
    mkdir -p lib
    cat > "$AUTH_FILE" << 'EOF'
// Fonction de connexion mock pour l'environnement de développement
export async function mockLogin(email: string) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('mockLogin ne peut être utilisé qu\'en développement')
  }

  // Simulation d'un utilisateur pour le mode dev
  return {
    id: `dev-${Date.now()}`,
    email: email.toLowerCase().trim(),
    role: 'free' as const,
    created_at: new Date().toISOString(),
  }
}
EOF
    echo "   ✅ lib/auth.ts créé avec mockLogin"
fi

# 6. Vérifier ESLint config
echo ""
echo "🔧 5. Vérification de la configuration ESLint..."
if [ ! -f ".eslintrc.json" ]; then
    echo "   ⚠️  .eslintrc.json manquant, création..."
    cat > .eslintrc.json << 'EOF'
{
  "extends": "next/core-web-vitals",
  "rules": {
    "react/no-unescaped-entities": "off"
  }
}
EOF
    echo "   ✅ .eslintrc.json créé"
else
    echo "   ✅ .eslintrc.json présent"
fi

# 7. Nettoyer et réinstaller
echo ""
echo "🧹 6. Nettoyage et réinstallation des dépendances..."
rm -rf node_modules package-lock.json
npm install

echo ""
echo "✅ Corrections terminées !"
echo ""
echo "📝 Prochaines étapes :"
echo "   1. Vérifiez les changements: git status"
echo "   2. Commitez: git add . && git commit -m 'fix: correct build issues'"
echo "   3. Poussez: git push"
echo ""

