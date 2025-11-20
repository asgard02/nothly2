# Analyse du problème de génération de flashcards/quiz

## Problèmes identifiés

### 1. **Limitation du corpus à 120k caractères**
- **Fichier** : `lib/collections/processor.ts` ligne 34
- **Problème** : `CONTEXT_CHAR_LIMIT = 120_000` limite le corpus envoyé à l'IA
- **Impact** : Même si un document fait 200k caractères, seulement 120k sont envoyés
- **Conséquence** : Le calcul utilise `totalChars` du corpus tronqué, pas du document complet
- **Solution** : Utiliser la taille réelle du document pour le calcul, pas celle du corpus tronqué

### 2. **Valeurs par défaut qui écrasent les vraies valeurs**
- **Fichier** : `lib/ai-generation.ts` ligne 264-265
- **Problème** : 
  ```typescript
  const flashcardsTarget = (metadata as any)?.flashcardsTarget || 16
  const quizTarget = (metadata as any)?.quizTarget || 9
  ```
- **Impact** : Si `flashcardsTarget` est `0` ou `undefined`, on utilise 16 au lieu de la vraie valeur
- **Solution** : Vérifier explicitement si la valeur existe

### 3. **Prompt système modifié avec `.replace()` qui peut échouer**
- **Fichier** : `lib/ai-generation.ts` ligne 332-337
- **Problème** : Si le texte exact "Tu es Nothly, assistant pédagogique." n'est pas trouvé, le remplacement échoue silencieusement
- **Solution** : Construire le prompt système directement avec les nombres

### 4. **max_tokens peut être insuffisant**
- **Fichier** : `lib/ai-generation.ts` ligne 348
- **Problème** : Estimation `flashcardsTarget * 100 + quizTarget * 150` peut être trop basse
- **Impact** : Pour 50 flashcards + 25 quiz = 8750 tokens, mais si chaque flashcard fait 150 tokens, ça dépasse
- **Solution** : Augmenter l'estimation ou utiliser une limite plus haute

### 5. **Le corpus peut être vide ou trop court**
- **Fichier** : `lib/collections/processor.ts` ligne 235
- **Problème** : Si le corpus est tronqué à 120k mais le document fait 200k, l'IA ne voit pas tout
- **Solution** : Informer l'IA de la taille réelle du document dans les métadonnées

### 6. **Pas de validation après génération**
- **Fichier** : `lib/collections/processor.ts` ligne 273-289
- **Problème** : On log seulement, mais on n'essaie pas de régénérer si insuffisant
- **Solution** : Ajouter une logique de retry si le nombre généré est insuffisant

## Solutions proposées

### Solution 1 : Utiliser la taille réelle du document pour le calcul
```typescript
// Calculer avant de tronquer le corpus
const totalDocumentChars = extracted.reduce((sum, e) => sum + e.textLength, 0)
const { flashcardsCount, quizCount } = calculateOptimalCounts(totalDocumentChars)

// Ensuite tronquer le corpus pour l'IA
const { corpus, included, totalChars } = buildCorpus(extracted)
```

### Solution 2 : Construire le prompt système directement
```typescript
if (mode === "collection" && metadata) {
  const flashcardsTarget = (metadata as any)?.flashcardsTarget ?? 16
  const quizTarget = (metadata as any)?.quizTarget ?? 9
  
  systemPrompt = `Tu es Nothly, assistant pédagogique.

⚠️ EXIGENCE CRITIQUE : Tu DOIS générer EXACTEMENT ${flashcardsTarget} flashcards et EXACTEMENT ${quizTarget} questions de quiz. C'est une exigence absolue, non négociable.

${buildSystemPrompt(mode).replace("Tu es Nothly, assistant pédagogique.", "")}`
}
```

### Solution 3 : Augmenter max_tokens et améliorer l'estimation
```typescript
// Estimation plus généreuse
const estimatedTokens = flashcardsTarget * 150 + quizTarget * 200 + 1000
maxTokens = Math.max(8000, Math.min(estimatedTokens, 16000))
```

### Solution 4 : Ajouter les métadonnées de taille réelle
```typescript
const metadata = {
  // ... autres champs
  totalDocumentCharacters: totalDocumentChars, // Taille réelle
  corpusCharacters: totalChars, // Taille du corpus envoyé
  flashcardsTarget: targetFlashcards,
  quizTarget: targetQuiz,
}
```

### Solution 5 : Retry si insuffisant
```typescript
let flashcards = aiResult.data.flashcards ?? []
let quizQuestions = aiResult.data.quiz ?? []

if (flashcards.length < targetFlashcards || quizQuestions.length < targetQuiz) {
  console.warn("Première génération insuffisante, nouvelle tentative...")
  // Retry avec prompt encore plus explicite
}
```


