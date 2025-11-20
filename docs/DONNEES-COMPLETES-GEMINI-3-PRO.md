# Données Complètes pour Gemini 3 Pro - Amélioration Génération Flashcards/Quiz

## Contexte du Projet

**Nothly** est une application de révision qui génère automatiquement des flashcards et des questions de quiz à partir de documents PDF. Le système utilise GPT-4o/GPT-4o-mini pour analyser un corpus de texte et générer une collection de révision structurée.

## Problème Principal

L'IA ne génère **pas assez d'éléments** malgré des instructions explicites :
- **Demandé** : 50 flashcards + 25 quiz
- **Généré** : ~12 flashcards + ~8 quiz
- **Taux de complétion** : ~24% flashcards, ~32% quiz

## Architecture Actuelle

### 1. Flux de Génération

```
Document PDF → Extraction texte → buildCorpus() → generateCollectionStudySet() → GPT-4o → JSON → Base de données
```

### 2. Code Actuel - Prompt Système

**Fichier** : `lib/ai-generation.ts` (lignes 201-262)

```typescript
case "collection":
  return `Tu es Nothly, un assistant pédagogique expert dans la création de matériel d'étude structuré.

### MISSION

Analyser méthodiquement un corpus de texte et générer une collection de révision complète, en respectant rigoureusement les quantités demandées.

### FORMAT DE SORTIE

La réponse DOIT être un unique objet JSON strict, sans aucun commentaire ou texte en dehors du JSON.

{
  "flashcards": [
    { "question": string, "answer": string, "tags": ["string"] }
  ],
  "quiz": [
    {
      "id": string,
      "type": "multiple_choice" | "true_false" | "completion",
      "prompt": string,
      "options": string[] | null,
      "answer": string,
      "explanation": string,
      "tags": ["string"]
    }
  ],
  "metadata": {
    "recommendedSessionLength": number,
    "summary": string,
    "notes": ["string"]
  }
}

### PROCESSUS DE GÉNÉRATION OBLIGATOIRE (Étape par étape)

1. **Lecture et Analyse :** Lis l'intégralité du corpus fourni. Identifie les thèmes principaux, sous-thèmes, définitions, formules (LaTeX), dates, et concepts clés.

2. **Planification de Contenu :**
   * (Interne) Dresse une liste de concepts distincts à transformer en flashcards selon le nombre demandé.
   * (Interne) Dresse une liste de points de connaissance distincts à transformer en questions de quiz selon le nombre demandé.
   * *Stratégie :* Pour atteindre ces nombres, parcours méthodiquement TOUT le corpus. Si le corpus est long, attribue un quota de questions à chaque section principale pour garantir une couverture complète. Ne te limite pas aux premiers paragraphes.

3. **Génération (Flashcards) :** Rédige toutes les flashcards demandées.
   * \`question\` : Un rappel clair et concis (ex: "Définition de X", "Principe clé de Y").
   * \`answer\` : La réponse factuelle, détaillée et précise. Utilise $\\LaTeX$ pour les équations.
   * \`tags\` : Thématiques utiles (ex: "analyse", "théorème", "définition").

4. **Génération (Quiz) :** Rédige toutes les questions de quiz demandées.
   * *Mix de types :* Assure un mélange sain (ex: si le nombre demandé >= 5, au moins 3 QCM, 1 V/F, 1 Complétion).
   * *QCM :* 4 options claires (1 correcte, 3 distracteurs plausibles).
   * \`explanation\` : Courte (1-2 phrases) et pédagogique.

5. **Métadonnées et Finalisation :**
   * \`summary\` : Synthèse (3-4 phrases) des notions clés du corpus.
   * \`recommendedSessionLength\` : Estimation (en minutes) du temps de révision.
   * *Vérification finale :* Compte le nombre d'éléments dans \`flashcards\` et \`quiz\` pour t'assurer qu'ils correspondent EXACTEMENT aux cibles spécifiées dans le message utilisateur.

### RÈGLES CRITIQUES

- **Source unique :** Utilise EXCLUSIVEMENT les informations du corpus.
- **Aucun texte hors JSON.**
- **Complétion :** La tâche n'est terminée que lorsque les DEUX nombres cibles sont atteints.`
```

### 3. Code Actuel - Message Utilisateur

**Fichier** : `lib/ai-generation.ts` (lignes 293-320)

```typescript
if (mode === "collection") {
  const flashcardsTarget = (metadata as any)?.flashcardsTarget ?? 16
  const quizTarget = (metadata as any)?.quizTarget ?? 9
  
  return JSON.stringify(
    {
      instructions: `Génère une collection de révision complète basée sur le corpus. Respecte impérativement les cibles de génération spécifiées.`,
      context: {
        ...(metadata ?? {}),
        collectionTitle: (metadata as any)?.collectionTitle,
        tags: (metadata as any)?.tags ?? [],
        totalSources: (metadata as any)?.totalSources ?? 1,
        totalDocumentCharacters: (metadata as any)?.totalDocumentCharacters,
        corpusCharacters: (metadata as any)?.corpusCharacters,
        flashcardsTarget: flashcardsTarget,
        quizTarget: quizTarget,
        sources: (metadata as any)?.sources ?? [],
      },
      corpus: text,
      flashcardsTarget: flashcardsTarget,
      quizTarget: quizTarget,
      REQUIRED_FLASHCARDS: flashcardsTarget,
      REQUIRED_QUIZ: quizTarget,
    },
    null,
    2
  )
}
```

### 4. Code Actuel - Configuration API

**Fichier** : `lib/ai-generation.ts` (lignes 354-393)

```typescript
async function runStructuredMode<T>(mode: StructuredMode, text: string, metadata?: GenerationMetadata): Promise<GenerationResult<T>> {
  const client = getClient()
  
  const systemPrompt = buildSystemPrompt(mode)
  const userMessage = buildUserMessage(mode, text, metadata)

  // Calculer max_tokens dynamiquement pour les collections selon le nombre demandé
  let maxTokens = mode === "collection" ? 4000 : 3500
  if (mode === "collection" && metadata) {
    const flashcardsTarget = (metadata as any).flashcardsTarget ?? 16
    const quizTarget = (metadata as any).quizTarget ?? 9
    // Estimation généreuse : ~200-250 tokens par flashcard, ~300-400 tokens par quiz
    // Utilisons une moyenne conservatrice pour éviter les coupures
    const estimatedTokens = flashcardsTarget * 250 + quizTarget * 400 + 2000 // +2000 pour metadata, JSON structure et marge
    // Augmenter la limite maximale à 25000 pour les grandes collections
    maxTokens = Math.max(8000, Math.min(estimatedTokens, 25000)) // Min 8000, max 25000
    console.log(`[runStructuredMode] Calcul max_tokens: ${flashcardsTarget} FC + ${quizTarget} Q = ${estimatedTokens} tokens estimés, limité à ${maxTokens} tokens`)
  }

  // Utiliser un modèle plus puissant pour les grandes collections
  let model = "gpt-4o-mini"
  if (mode === "collection" && metadata) {
    const flashcardsTarget = (metadata as any).flashcardsTarget ?? 16
    const quizTarget = (metadata as any).quizTarget ?? 9
    // Si beaucoup de contenu demandé, utiliser gpt-4o pour meilleure qualité
    if (flashcardsTarget > 20 || quizTarget > 10) {
      model = "gpt-4o" // Modèle plus puissant pour les grandes collections
      console.log(`[runStructuredMode] Utilisation de gpt-4o pour ${flashcardsTarget} FC + ${quizTarget} Q`)
    }
  }

  const completion = await client.chat.completions.create({
    model: model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    temperature: 0.3, // Réduire la température pour plus de cohérence
    max_tokens: maxTokens,
    response_format: { type: "json_object" },
  } as any)

  // ... reste du code
}
```

### 5. Code Actuel - Construction du Corpus

**Fichier** : `lib/collections/processor.ts` (lignes 34-132)

```typescript
const CONTEXT_CHAR_LIMIT = Number(process.env.COLLECTION_CONTEXT_LIMIT_CHARS || 120_000)

function buildCorpus(extracted: ExtractedSource[]): { corpus: string; included: ExtractedSource[]; totalChars: number } {
  if (extracted.length === 0) {
    return { corpus: "", included: [], totalChars: 0 }
  }

  const limit = CONTEXT_CHAR_LIMIT > 0 ? CONTEXT_CHAR_LIMIT : Number.POSITIVE_INFINITY
  let used = 0
  const included: ExtractedSource[] = []
  const chunks: string[] = []

  for (const entry of extracted) {
    if (!entry.textLength || !entry.text) {
      continue
    }

    const remaining = limit - used
    if (remaining <= 0) {
      break
    }

    const text = entry.textLength > remaining ? entry.text.slice(0, remaining) : entry.text

    chunks.push(`### ${entry.source.title}\n${text}`)
    used += text.length
    included.push({
      ...entry,
      text,
      textLength: text.length,
    })
  }

  return {
    corpus: chunks.join("\n\n").trim(),
    included,
    totalChars: used,
  }
}
```

### 6. Code Actuel - Calcul des Cibles

**Fichier** : `lib/collections/processor.ts` (lignes 43-85)

```typescript
function calculateOptimalCounts(totalChars: number): { flashcardsCount: number; quizCount: number } {
  // Seuils en caractères
  const SMALL_THRESHOLD = 5_000 // Petit document
  const MEDIUM_THRESHOLD = 30_000 // Document moyen
  const LARGE_THRESHOLD = 100_000 // Grand document

  let flashcardsCount: number
  let quizCount: number

  if (totalChars < SMALL_THRESHOLD) {
    flashcardsCount = Math.max(3, Math.floor(totalChars / 500))
    quizCount = Math.max(2, Math.floor(totalChars / 1000))
  } else if (totalChars < MEDIUM_THRESHOLD) {
    flashcardsCount = Math.floor(totalChars / 2000)
    quizCount = Math.floor(totalChars / 4000)
    flashcardsCount = Math.min(Math.max(flashcardsCount, 5), 20)
    quizCount = Math.min(Math.max(quizCount, 3), 12)
  } else if (totalChars < LARGE_THRESHOLD) {
    flashcardsCount = Math.floor(totalChars / 2500)
    quizCount = Math.floor(totalChars / 5000)
    flashcardsCount = Math.min(Math.max(flashcardsCount, 15), 40)
    quizCount = Math.min(Math.max(quizCount, 8), 20)
  } else {
    // Très grand document (> 100k)
    flashcardsCount = Math.min(Math.floor(totalChars / 2000), 50)
    quizCount = Math.min(Math.floor(totalChars / 4000), 25)
  }

  flashcardsCount = Math.max(flashcardsCount, 3)
  quizCount = Math.max(quizCount, 2)

  return { flashcardsCount, quizCount }
}
```

## Contraintes Techniques

### Modèles Disponibles
- **GPT-4o** : Fenêtre de contexte 128k tokens, sortie jusqu'à 16k tokens (peut être augmentée)
- **GPT-4o-mini** : Fenêtre de contexte 128k tokens, sortie jusqu'à 16k tokens

### Limites Actuelles
- **Corpus max** : 120 000 caractères (tronqué si plus grand)
- **max_tokens** : 8 000 - 25 000 (calculé dynamiquement)
- **Temperature** : 0.3
- **Format** : JSON strict (`response_format: { type: "json_object" }`)

### Calcul Tokens Actuel

Pour **50 flashcards + 25 quiz** :
- Estimation : `50 * 250 + 25 * 400 + 2000 = 21 500 tokens`
- Limite appliquée : `min(21 500, 25 000) = 21 500 tokens`
- Modèle utilisé : `gpt-4o` (car >20 flashcards ou >10 quiz)

## Problèmes Identifiés

### 1. Pas de Chunking pour l'Analyse
- **Problème** : Le corpus entier (jusqu'à 120k caractères) est envoyé en **une seule requête**
- **Impact** : L'IA doit analyser tout d'un coup et peut avoir du mal à couvrir tout le corpus
- **Solution potentielle** : Diviser le corpus en chunks logiques et faire plusieurs appels API

### 2. Prompt Peut Être Amélioré
- Le prompt système est méthodique mais peut manquer de précision sur la stratégie de couverture
- Le message utilisateur est simplifié mais peut manquer de redondance sur les nombres

### 3. Estimation Tokens Peut Être Insuffisante
- Estimation actuelle : 250 tokens/flashcard, 400 tokens/quiz
- Réalité observée : Peut varier selon la complexité
- Risque : Si l'estimation est trop basse, la réponse est coupée

## Exemple de Données Réelles

### Cas Test 1 : Grande Collection
```json
{
  "totalDocumentCharacters": 200000,
  "corpusCharacters": 120000,
  "flashcardsTarget": 50,
  "quizTarget": 25,
  "sources": [
    {
      "title": "Cours de Mathématiques Avancées",
      "textLength": 120000,
      "tags": ["math", "analyse"]
    }
  ]
}
```

**Résultat observé** :
- Flashcards générées : 12 (attendu 50) ❌
- Quiz générés : 8 (attendu 25) ❌
- Taux de complétion : 24% flashcards, 32% quiz

### Cas Test 2 : Collection Moyenne
```json
{
  "totalDocumentCharacters": 50000,
  "corpusCharacters": 50000,
  "flashcardsTarget": 20,
  "quizTarget": 12,
  "sources": [
    {
      "title": "Introduction à la Physique",
      "textLength": 50000,
      "tags": ["physique", "mécanique"]
    }
  ]
}
```

**Résultat observé** :
- Flashcards générées : 15 (attendu 20) ⚠️
- Quiz générés : 10 (attendu 12) ⚠️
- Taux de complétion : 75% flashcards, 83% quiz

## Objectifs pour Gemini 3 Pro

### Objectif Principal
**Garantir que l'IA génère systématiquement le nombre exact de flashcards et quiz demandés, même pour les grandes collections (50+ flashcards, 25+ quiz).**

### Objectifs Secondaires
1. **Améliorer le prompt système** pour être plus efficace avec GPT-4o/GPT-4o-mini
2. **Optimiser le message utilisateur** pour maximiser la redondance des nombres
3. **Considérer le chunking** si nécessaire pour les très grands corpus
4. **Améliorer l'estimation des tokens** pour éviter les coupures
5. **Ajouter une stratégie de validation** post-génération

## Questions pour Gemini 3 Pro

1. **Le prompt système actuel est-il optimal ?** Peut-on l'améliorer pour forcer l'IA à générer exactement le nombre demandé ?

2. **Faut-il implémenter le chunking ?** Si oui, quelle stratégie de division du corpus serait la plus efficace ?

3. **L'estimation des tokens est-elle correcte ?** Faut-il être plus généreux ou ajuster selon le modèle ?

4. **Le message utilisateur est-il assez redondant ?** Faut-il répéter encore plus les nombres cibles ?

5. **Y a-t-il d'autres techniques** (ex: validation incrémentale, génération par batches) qui pourraient aider ?

## Structure JSON Attendue

```json
{
  "flashcards": [
    {
      "question": "Qu'est-ce que la dérivée d'une fonction ?",
      "answer": "La dérivée d'une fonction f en un point x représente le taux de variation instantané de f en x. Elle est notée f'(x) ou df/dx.",
      "tags": ["math", "analyse", "dérivée"]
    }
    // ... 49 autres flashcards
  ],
  "quiz": [
    {
      "id": "quiz-1",
      "type": "multiple_choice",
      "prompt": "Quelle est la dérivée de x² ?",
      "options": ["2x", "x", "2x²", "x²"],
      "answer": "2x",
      "explanation": "La dérivée de x² est 2x selon la règle de dérivation des puissances.",
      "tags": ["math", "dérivée", "polynôme"]
    }
    // ... 24 autres quiz
  ],
  "metadata": {
    "recommendedSessionLength": 60,
    "summary": "Cette collection couvre les concepts fondamentaux de l'analyse mathématique...",
    "notes": ["Réviser les théorèmes fondamentaux", "Pratiquer les exercices de dérivation"]
  }
}
```

## Métriques de Succès

- ✅ **Taux de complétion flashcards** : ≥ 95%
- ✅ **Taux de complétion quiz** : ≥ 95%
- ✅ **Qualité** : Flashcards et quiz pertinents, couvrant tout le corpus
- ✅ **Performance** : Génération complète en < 2 minutes pour 50+25

## Informations Supplémentaires

- **Langue** : Français
- **Domaine** : Éducation, révision, apprentissage
- **Format de sortie** : JSON strict uniquement
- **Validation** : Le JSON est parsé et validé avant insertion en base de données
- **Base de données** : Supabase (PostgreSQL)
- **Framework** : Next.js 14, TypeScript

---

**Date** : 2024
**Version** : 1.0
**Statut** : En attente d'amélioration par Gemini 3 Pro

