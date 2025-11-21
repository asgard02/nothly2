#!/bin/bash

# Script de vérification rapide des permissions GCS
# Usage: ./scripts/quick-check-gcs.sh

echo "🔍 Vérification rapide des permissions Google Cloud Storage..."
echo ""

# Vérifier que .env.local existe
if [ ! -f .env.local ]; then
    echo "❌ Fichier .env.local non trouvé"
    exit 1
fi

echo "✅ Fichier .env.local trouvé"
echo ""

# Exécuter le test
echo "🧪 Exécution du test de permissions..."
echo ""

npx tsx --env-file=.env.local scripts/test-storage-auth.ts

EXIT_CODE=$?

echo ""
if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ ✅ ✅ Tout fonctionne parfaitement !"
    echo "   Les permissions sont correctement configurées."
else
    echo "❌ Le test a échoué."
    echo "   Vérifiez que vous avez ajouté le rôle 'Storage Object Admin'"
    echo "   et attendez 2-5 minutes pour la propagation."
fi

exit $EXIT_CODE

