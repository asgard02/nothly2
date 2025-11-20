# Prompt Système Amélioré - Implémentation

## Résumé des changements

Ce document décrit les améliorations apportées au système de génération de flashcards et quiz pour garantir que l'IA génère toujours le nombre exact d'éléments demandés.

## Problème identifié

L'IA ne générait pas assez d'éléments (ex: 12 flashcards au lieu de 50, 8 quiz au lieu de 25) malgré des instructions explicites. Deux causes principales identifiées :

1. **Prompt système trop "agressif"** : Répétitions multiples sans structure méthodique
2. **Limite `max_tokens` insuffisante** : Limité à 16000 tokens, ce qui peut couper les réponses pour les grandes collections

## Solutions implémentées

### 1. Nouveau prompt système méthodique

**Fichier modifié :** `lib/ai-generation.ts`

Le prompt système a été remplacé par une version structurée en 5 étapes :

1. **Lecture et Analyse** : Analyse complète du corpus
2. **Planification de Contenu** : Création d'une liste interne de concepts avant génération
3. **Génération (Flashcards)** : Rédaction méthodique
4. **Génération (Quiz)** : Rédaction avec mix de types
5. **Métadonnées et Finalisation** : Vérification finale des quantités

**Avantages :**
- Approche méthodique plutôt qu'agressive
- Force l'IA à planifier avant de générer
- Stratégie de couverture explicite pour les longs corpus

### 2. Augmentation de `max_tokens`

**Avant :**
```typescript
maxTokens = Math.max(8000, Math.min(estimatedTokens, 16000)) // Max 16000
```

**Après :**
```typescript
// Estimation généreuse : ~250 tokens par flashcard, ~400 tokens par quiz
const estimatedTokens = flashcardsTarget * 250 + quizTarget * 400 + 2000
maxTokens = Math.max(8000, Math.min(estimatedTokens, 25000)) // Max 25000
```

**Calcul pour 50 flashcards + 25 quiz :**
- Avant : `50 * 150 + 25 * 200 + 1000 = 13500 tokens` → limité à 16000 ✅
- Après : `50 * 250 + 25 * 400 + 2000 = 21500 tokens` → limité à 21500 ✅

**Impact :** Les grandes collections peuvent maintenant être générées complètement sans coupure.

### 3. Simplification du prompt utilisateur

Le prompt utilisateur a été allégé car le System Prompt s'occupe maintenant du "comment". Les variables restent redondantes pour garantir la clarté.

**Structure :**
```json
{
  "instructions": "Génère une collection de révision complète basée sur le corpus. Respecte impérativement les cibles de génération spécifiées.",
  "context": { ... },
  "corpus": "...",
  "flashcardsTarget": 50,
  "quizTarget": 25,
  "REQUIRED_FLASHCARDS": 50,
  "REQUIRED_QUIZ": 25
}
```

## Fichiers modifiés

- `lib/ai-generation.ts` :
  - Fonction `buildSystemPrompt()` : Nouveau prompt système pour "collection"
  - Fonction `runStructuredMode()` : Augmentation de `max_tokens` et amélioration de l'estimation
  - Fonction `buildUserMessage()` : Simplification du prompt utilisateur pour "collection"

## Tests recommandés

1. **Petite collection** (16 flashcards, 9 quiz) : Vérifier que ça fonctionne toujours
2. **Collection moyenne** (30 flashcards, 15 quiz) : Vérifier la génération complète
3. **Grande collection** (50 flashcards, 25 quiz) : Vérifier que tous les éléments sont générés

## Notes techniques

- **Modèle utilisé** : GPT-4o pour les grandes collections (>20 flashcards ou >10 quiz), GPT-4o-mini sinon
- **Temperature** : 0.3 (cohérence)
- **Format de réponse** : JSON strict (`response_format: { type: "json_object" }`)
- **Limite maximale** : 25000 tokens (suffisant pour ~60 flashcards + ~30 quiz)

## Prochaines étapes (si nécessaire)

Si le problème persiste malgré ces améliorations, considérer :

1. **Pagination** : Diviser les grandes collections en plusieurs appels API
2. **Validation post-génération** : Vérifier les quantités et relancer si incomplet
3. **Prompt encore plus explicite** : Ajouter des exemples de comptage dans le prompt

