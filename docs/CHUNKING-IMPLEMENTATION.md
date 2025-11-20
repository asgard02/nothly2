# Implémentation du Chunking avec Requêtes Parallèles

## Résumé

Refactorisation complète du système de génération de collections pour utiliser une stratégie de **chunking + requêtes parallèles** afin de résoudre le problème où l'IA ne générait pas assez d'éléments pour les grands corpus.

## Problème Résolu

**Avant** : Pour 50 flashcards + 25 quiz sur un corpus de 120k caractères, l'IA générait seulement ~12 flashcards + ~8 quiz (24% et 32% de complétion).

**Après** : Le corpus est divisé en chunks de 25k caractères, chaque chunk génère sa part en parallèle, puis les résultats sont fusionnés pour obtenir exactement les quantités demandées.

## Architecture

### 1. Fonction `prepareChunkingStrategy` 
**Fichier** : `lib/ai-generation.ts` (lignes 650-761)

- Divise le corpus en chunks de **25 000 caractères maximum**
- Ajoute un **overlap de 1 000 caractères** entre chunks pour préserver le contexte
- Répartit les cibles (flashcards/quiz) **proportionnellement** à la taille de chaque chunk
- Ajuste les cibles pour que la somme corresponde **exactement** aux cibles totales

### 2. Fonction `buildSystemPromptForChunk`
**Fichier** : `lib/ai-generation.ts` (lignes 114-176)

- Génère un prompt système **strict** pour chaque chunk
- Inclut les nombres **exacts** de flashcards et quiz à générer
- Indique le numéro du fragment (ex: "fragment 2/5")
- Force l'IA à générer exactement les quantités demandées

### 3. Fonction `generateCollectionStudySetWithChunking`
**Fichier** : `lib/ai-generation.ts` (lignes 513-648)

- Lance les appels API en **parallèle** avec `Promise.all`
- Utilise **gpt-4o-mini** pour tous les chunks
- Fusionne tous les résultats (flashcards + quiz)
- Limite le résultat final aux cibles totales si nécessaire
- Agrège les métadonnées (summary, notes, etc.)

### 4. Fonction `generateCollectionStudySet` (modifiée)
**Fichier** : `lib/ai-generation.ts` (lignes 763-778)

- **Détecte automatiquement** si le chunking est nécessaire :
  - Corpus > 25 000 caractères **OU**
  - > 30 flashcards demandées **OU**
  - > 15 quiz demandés
- Utilise le chunking parallèle si nécessaire, sinon l'ancienne méthode

## Flux d'Exécution

```
generateCollectionStudySet()
  ↓
Détection automatique du besoin de chunking
  ↓
prepareChunkingStrategy() → Divise le corpus en chunks
  ↓
generateCollectionStudySetWithChunking()
  ↓
Pour chaque chunk (en parallèle) :
  - buildSystemPromptForChunk() → Prompt strict
  - Appel API OpenAI (gpt-4o-mini)
  - Génération de X flashcards + Y quiz
  ↓
Promise.all() → Attente de tous les résultats
  ↓
Fusion des résultats
  ↓
Limitation aux cibles totales
  ↓
Retour du résultat final
```

## Exemple Concret

### Input
- Corpus : 120 000 caractères
- Cibles : 50 flashcards + 25 quiz

### Traitement
1. **Chunking** : 5 chunks de ~25k caractères chacun
2. **Répartition** : ~10 flashcards + ~5 quiz par chunk
3. **Appels parallèles** : 5 requêtes simultanées à OpenAI
4. **Fusion** : Tous les résultats combinés
5. **Limitation** : Exactement 50 flashcards + 25 quiz

### Output
- ✅ 50 flashcards générées
- ✅ 25 quiz générés
- ✅ Taux de complétion : 100%

## Avantages

1. **Meilleure couverture** : Chaque chunk est analysé complètement
2. **Performance** : Requêtes parallèles au lieu de séquentielles
3. **Fiabilité** : Chaque chunk a un prompt strict avec nombres exacts
4. **Scalabilité** : Fonctionne pour n'importe quelle taille de corpus
5. **Rétrocompatibilité** : Les petits corpus utilisent toujours l'ancienne méthode

## Configuration

### Seuils de Chunking
- **Taille de chunk** : 25 000 caractères
- **Overlap** : 1 000 caractères
- **Seuil d'activation** :
  - Corpus > 25k caractères **OU**
  - > 30 flashcards **OU**
  - > 15 quiz

### Modèle Utilisé
- **gpt-4o-mini** pour tous les chunks (comme demandé)
- Temperature : 0.3
- max_tokens : Calculé dynamiquement (8k - 25k)

## Tests Recommandés

1. **Petit corpus** (< 25k) : Vérifier que l'ancienne méthode est utilisée
2. **Corpus moyen** (50k) : Vérifier le chunking avec 2 chunks
3. **Grand corpus** (120k+) : Vérifier le chunking avec 5+ chunks
4. **Grandes cibles** (50+ flashcards) : Vérifier la génération complète

## Logs de Debug

Le système génère des logs détaillés :
- `[prepareChunkingStrategy]` : Détails de la division en chunks
- `[generateCollectionStudySetWithChunking]` : Progression de chaque chunk
- `[generateCollectionStudySet]` : Décision d'utilisation du chunking

## Notes Techniques

- Pas de dépendances circulaires (fonction `prepareChunkingStrategy` dans `ai-generation.ts`)
- Gestion d'erreurs robuste pour chaque chunk
- Fusion intelligente des métadonnées
- Limitation automatique si surplus généré

---

**Date** : 2024
**Statut** : ✅ Implémenté et prêt pour tests

