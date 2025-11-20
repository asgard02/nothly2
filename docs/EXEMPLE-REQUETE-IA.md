# Exemple Concret de Requête Envoyée à l'IA

## Contexte

Ce document montre un exemple concret de ce qui est envoyé à GPT-4o/GPT-4o-mini lors de la génération d'une collection.

## Cas : Grande Collection (50 flashcards + 25 quiz)

### 1. System Prompt (envoyé à l'IA)

```
Tu es Nothly, un assistant pédagogique expert dans la création de matériel d'étude structuré.

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
   * `question` : Un rappel clair et concis (ex: "Définition de X", "Principe clé de Y").
   * `answer` : La réponse factuelle, détaillée et précise. Utilise $\LaTeX$ pour les équations.
   * `tags` : Thématiques utiles (ex: "analyse", "théorème", "définition").

4. **Génération (Quiz) :** Rédige toutes les questions de quiz demandées.
   * *Mix de types :* Assure un mélange sain (ex: si le nombre demandé >= 5, au moins 3 QCM, 1 V/F, 1 Complétion).
   * *QCM :* 4 options claires (1 correcte, 3 distracteurs plausibles).
   * `explanation` : Courte (1-2 phrases) et pédagogique.

5. **Métadonnées et Finalisation :**
   * `summary` : Synthèse (3-4 phrases) des notions clés du corpus.
   * `recommendedSessionLength` : Estimation (en minutes) du temps de révision.
   * *Vérification finale :* Compte le nombre d'éléments dans `flashcards` et `quiz` pour t'assurer qu'ils correspondent EXACTEMENT aux cibles spécifiées dans le message utilisateur.

### RÈGLES CRITIQUES

- **Source unique :** Utilise EXCLUSIVEMENT les informations du corpus.
- **Aucun texte hors JSON.**
- **Complétion :** La tâche n'est terminée que lorsque les DEUX nombres cibles sont atteints.
```

### 2. User Message (envoyé à l'IA)

```json
{
  "instructions": "Génère une collection de révision complète basée sur le corpus. Respecte impérativement les cibles de génération spécifiées.",
  "context": {
    "collectionTitle": "Cours de Mathématiques Avancées",
    "tags": ["math", "analyse", "dérivées"],
    "totalSources": 1,
    "totalDocumentCharacters": 200000,
    "corpusCharacters": 120000,
    "flashcardsTarget": 50,
    "quizTarget": 25,
    "sources": [
      {
        "title": "Cours de Mathématiques Avancées",
        "tags": ["math", "analyse"],
        "textLength": 120000
      }
    ]
  },
  "corpus": "### Cours de Mathématiques Avancées\n\nChapitre 1 : Introduction aux dérivées\n\nLa dérivée d'une fonction est un concept fondamental en analyse mathématique. Elle représente le taux de variation instantané d'une fonction en un point donné...\n\n[120 000 caractères de texte extrait du PDF]\n\n...fin du document.",
  "flashcardsTarget": 50,
  "quizTarget": 25,
  "REQUIRED_FLASHCARDS": 50,
  "REQUIRED_QUIZ": 25
}
```

### 3. Configuration API

```typescript
{
  model: "gpt-4o",  // Car flashcardsTarget > 20
  messages: [
    { role: "system", content: "[System Prompt ci-dessus]" },
    { role: "user", content: "[User Message JSON ci-dessus]" }
  ],
  temperature: 0.3,
  max_tokens: 21500,  // Calculé : 50 * 250 + 25 * 400 + 2000
  response_format: { type: "json_object" }
}
```

## Résultat Attendu

```json
{
  "flashcards": [
    {
      "question": "Qu'est-ce que la dérivée d'une fonction ?",
      "answer": "La dérivée d'une fonction f en un point x représente le taux de variation instantané de f en x. Elle est notée f'(x) ou df/dx et se calcule comme la limite du taux d'accroissement.",
      "tags": ["math", "analyse", "dérivée"]
    },
    {
      "question": "Quelle est la dérivée de x² ?",
      "answer": "La dérivée de x² est 2x. On utilise la règle de dérivation des puissances : (x^n)' = n*x^(n-1).",
      "tags": ["math", "dérivée", "polynôme"]
    }
    // ... 48 autres flashcards (TOTAL : 50)
  ],
  "quiz": [
    {
      "id": "quiz-1",
      "type": "multiple_choice",
      "prompt": "Quelle est la dérivée de sin(x) ?",
      "options": ["cos(x)", "sin(x)", "-cos(x)", "-sin(x)"],
      "answer": "cos(x)",
      "explanation": "La dérivée de sin(x) est cos(x) selon les règles de dérivation des fonctions trigonométriques.",
      "tags": ["math", "trigonométrie", "dérivée"]
    }
    // ... 24 autres quiz (TOTAL : 25)
  ],
  "metadata": {
    "recommendedSessionLength": 90,
    "summary": "Cette collection couvre les concepts fondamentaux de l'analyse mathématique, notamment les dérivées, les intégrales, et les théorèmes fondamentaux du calcul différentiel.",
    "notes": [
      "Réviser les règles de dérivation de base",
      "Pratiquer les exercices de dérivation composée",
      "Maîtriser les applications des dérivées"
    ]
  }
}
```

## Résultat Observé (Problème Actuel)

```json
{
  "flashcards": [
    // ... seulement 12 flashcards au lieu de 50 ❌
  ],
  "quiz": [
    // ... seulement 8 quiz au lieu de 25 ❌
  ],
  "metadata": {
    "recommendedSessionLength": 45,
    "summary": "Cette collection couvre les concepts de base...",
    "notes": []
  }
}
```

## Analyse du Problème

1. **L'IA génère moins que demandé** : 12/50 flashcards (24%), 8/25 quiz (32%)
2. **Le corpus est complet** : 120k caractères envoyés
3. **Les tokens sont suffisants** : 21 500 tokens alloués
4. **Le modèle est puissant** : GPT-4o utilisé
5. **Le prompt semble clair** : Instructions explicites

**Hypothèses** :
- L'IA ne parcourt peut-être pas tout le corpus
- Le prompt peut manquer de force pour forcer la génération complète
- Il faudrait peut-être diviser le corpus en chunks pour une meilleure couverture

