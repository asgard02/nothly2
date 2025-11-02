#!/bin/bash

# Script complet : Correction + Commit + Push pour Vercel
set -e

echo "🚀 Correction complète du build Vercel + Push"
echo ""

# Exécuter le script de correction
if [ -f "./fix-build.sh" ]; then
    echo "📝 Exécution des corrections..."
    ./fix-build.sh
else
    echo "⚠️  fix-build.sh non trouvé, corrections manuelles..."
fi

echo ""
echo "📦 Vérification finale des fichiers critiques..."

# Vérifications finales
echo ""
echo "✅ Vérification package.json..."
if grep -q '"name": "nothly"' package.json; then
    echo "   ✓ Nom correct: nothly"
else
    echo "   ✗ Nom incorrect!"
    exit 1
fi

if ! grep -q "@supabase/auth-helpers-nextjs" package.json; then
    echo "   ✓ Aucune dépendance dépréciée"
else
    echo "   ✗ Dépendance dépréciée trouvée!"
    exit 1
fi

echo ""
echo "✅ Vérification app/api/dev-login/route.ts..."
if grep -q 'export const runtime = "nodejs"' app/api/dev-login/route.ts; then
    echo "   ✓ Runtime Node.js présent"
else
    echo "   ✗ Runtime Node.js manquant!"
    exit 1
fi

echo ""
echo "✅ Vérification lib/auth.ts..."
if grep -q "export.*mockLogin" lib/auth.ts; then
    echo "   ✓ mockLogin exportée"
else
    echo "   ✗ mockLogin manquante!"
    exit 1
fi

echo ""
echo "📊 Statut Git..."
git status --short

echo ""
read -p "⚠️  Voulez-vous commit et push ces changements sur GitHub ? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "📝 Ajout des fichiers..."
    git add .
    
    echo "💾 Création du commit..."
    git commit -m "fix: correct build issues for Vercel

- Fix package name: notlhy → nothly
- Remove deprecated @supabase/auth-helpers-nextjs
- Add NodeJS runtime for dev-login route
- Ensure mockLogin is exported
- Add ESLint configuration
- Clean dependencies"
    
    echo "🚀 Push vers GitHub..."
    git push
    
    echo ""
    echo "✅ Changements poussés sur GitHub !"
    echo "   Vercel va automatiquement relancer le build."
    echo "   Vérifiez le statut sur: https://vercel.com/dashboard"
else
    echo ""
    echo "⏸️  Push annulé."
    echo "   Pour push manuellement plus tard:"
    echo "   git add ."
    echo "   git commit -m 'fix: correct build issues'"
    echo "   git push"
fi

