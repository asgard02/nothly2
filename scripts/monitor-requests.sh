#!/bin/bash

echo "🔍 Surveillance des requêtes HTTP en temps réel"
echo "================================================"
echo ""
echo "Surveillance du port 3000..."
echo "Appuyez sur Ctrl+C pour arrêter"
echo ""

# Fonction pour afficher les statistiques
show_stats() {
    timestamp=$(date +%H:%M:%S)
    connections=$(lsof -i:3000 2>/dev/null | grep ESTABLISHED | wc -l | tr -d ' ')
    echo "[$timestamp] Connexions actives: $connections"
}

# Surveiller les requêtes toutes les 2 secondes
while true; do
    show_stats
    sleep 2
done


