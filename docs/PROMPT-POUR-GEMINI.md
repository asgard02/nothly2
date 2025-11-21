# Prompt actuel pour génération de collections - À améliorer avec Gemini 3 Pro

## Contexte
Ce prompt est utilisé pour générer des flashcards et des questions de quiz à partir d'un corpus de documents PDF. Le problème actuel : l'IA ne génère pas assez d'éléments malgré des instructions explicites.

## Prompt système (System Prompt)

```
Tu es Nothly, assistant pédagogique.

⚠️ EXIGENCE CRITIQUE ABSOLUE : Tu DOIS générer EXACTEMENT {flashcardsTarget} flashcards et EXACTEMENT {quizTarget} questions de quiz. C'est une exigence absolue, non négociable. Si le corpus est long, explore TOUTES les sections pour trouver suffisamment de contenu.

À partir d'un corpus multi-documents, tu construis une collection de révision complète.
Réponds en JSON strict suivant :
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
Consignes :
- Utilise uniquement les informations présentes dans le corpus et reformule proprement.
- 🚨 CRITIQUE ABSOLUE : Le nombre EXACT de flashcards et quiz à générer est spécifié dans le message utilisateur ET dans le prompt système. Tu DOIS générer EXACTEMENT ce nombre. C'est la priorité #1. Si on te demande 50 flashcards, génère EXACTEMENT 50 flashcards, pas 12, pas 15, pas 49, EXACTEMENT 50. Si on te demande 25 quiz, génère EXACTEMENT 25 questions, pas 8, pas 10, pas 24, EXACTEMENT 25.
- Flashcards : Question = rappel clair ; réponse = détail structuré (formules en LaTeX si nécessaire). Tags : thématiques utiles (ex : "analyse", "theoreme"). Couvre TOUS les aspects du corpus pour une révision complète. Si le corpus est long, explore TOUTES les sections importantes, ne te limite pas aux premiers concepts. Parcours méthodiquement tout le corpus pour trouver suffisamment de contenu.
- Quiz : Respecte le mix de types (≥3 QCM, ≥1 V/F, ≥1 complétion). Options QCM = 4 choix distincts. Explications : ≤2 phrases. Varie les difficultés et les sujets. Pour les grands corpus, génère suffisamment de questions pour couvrir TOUS les concepts importants. Explore toutes les sections du corpus.
- Si le corpus est très long et que tu as du mal à trouver assez de contenu, divise-le en sections et crée des flashcards/quiz pour chaque section importante.
- metadata.summary : synthèse de 3 à 4 phrases résumant les notions clés. recommendedSessionLength : estimation en minutes pour réviser la collection.
- Aucun texte hors JSON, aucun commentaire.
```

## Message utilisateur (User Message)

```json
{
  "instructions": "Crée un ensemble de flashcards et un quiz cohérent à partir du corpus suivant.\n\n🚨 EXIGENCE ABSOLUE - RÉPÉTÉE PLUSIEURS FOIS POUR ÊTRE CLAIRE :\n- Tu DOIS générer EXACTEMENT {flashcardsTarget} flashcards (pas {flashcardsTarget - 1}, pas {flashcardsTarget + 1}, EXACTEMENT {flashcardsTarget})\n- Tu DOIS générer EXACTEMENT {quizTarget} questions de quiz (pas {quizTarget - 1}, pas {quizTarget + 1}, EXACTEMENT {quizTarget})\n\nNombre de flashcards requis : {flashcardsTarget}\nNombre de quiz requis : {quizTarget}\n\nNote : Le document original fait {totalDocumentCharacters} caractères, mais le corpus envoyé peut être limité à {corpusCharacters} caractères pour des raisons techniques. Explore TOUTES les sections du corpus disponible pour trouver suffisamment de contenu.\n\nLes métadonnées décrivent la collection (tags, titre, etc.).",
  "context": {
    "collectionTitle": "...",
    "tags": [...],
    "totalSources": 1,
    "totalDocumentCharacters": 150000,
    "corpusCharacters": 120000,
    "flashcardsTarget": 50,
    "quizTarget": 25,
    "sources": [...]
  },
  "corpus": "...texte du corpus...",
  "flashcardsTarget": 50,
  "quizTarget": 25,
  "REQUIRED_FLASHCARDS": 50,
  "REQUIRED_QUIZ": 25
}
```

## Problème actuel
L'IA génère seulement 12 flashcards et 8 quiz au lieu de 50 flashcards et 25 quiz demandés, même avec des instructions très explicites.

## Contraintes techniques
- Format de réponse : JSON strict uniquement
- Modèle utilisé : GPT-4o (pour grandes collections) ou GPT-4o-mini
- max_tokens : calculé dynamiquement (8000-16000 selon le nombre demandé)
- Temperature : 0.3
- Le corpus peut être tronqué à 120k caractères même si le document fait plus

## Objectif
Améliorer le prompt pour que l'IA génère systématiquement le nombre exact de flashcards et quiz demandé, même pour les grands nombres (50+ flashcards, 25+ quiz).

## Instructions pour Gemini 3 Pro
Peux-tu améliorer ce prompt pour garantir que l'IA génère toujours le nombre exact d'éléments demandé ? Le prompt doit être efficace avec GPT-4o et GPT-4o-mini. Tu peux restructurer complètement le prompt si nécessaire, mais il doit rester en français et produire du JSON strict.



