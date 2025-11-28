# Prompt à améliorer - Version concise pour Gemini 3 Pro

## Mission
Améliorer un prompt pour génération de flashcards et quiz. L'IA ne génère pas assez d'éléments malgré des instructions explicites.

## Prompt actuel

### System Prompt
```
Tu es Nothly, assistant pédagogique.

⚠️ EXIGENCE CRITIQUE ABSOLUE : Tu DOIS générer EXACTEMENT {N} flashcards et EXACTEMENT {M} questions de quiz. C'est une exigence absolue, non négociable.

Réponds en JSON strict :
{
  "flashcards": [{"question": string, "answer": string, "tags": [string]}],
  "quiz": [{"id": string, "type": "multiple_choice"|"true_false"|"completion", "prompt": string, "options": string[]|null, "answer": string, "explanation": string, "tags": [string]}],
  "metadata": {"recommendedSessionLength": number, "summary": string, "notes": [string]}
}

Consignes :
- Utilise uniquement le corpus fourni
- Génère EXACTEMENT {N} flashcards et {M} quiz (pas moins, pas plus)
- Explore TOUTES les sections du corpus
- Flashcards : question claire, réponse détaillée, tags thématiques
- Quiz : mix de types (≥3 QCM, ≥1 V/F, ≥1 complétion), 4 options pour QCM
- Aucun texte hors JSON
```

### User Message
```json
{
  "instructions": "Génère EXACTEMENT {N} flashcards et {M} quiz. Document: {totalChars} chars, corpus: {corpusChars} chars.",
  "corpus": "...texte...",
  "flashcardsTarget": {N},
  "quizTarget": {M},
  "REQUIRED_FLASHCARDS": {N},
  "REQUIRED_QUIZ": {M}
}
```

## Problème
Pour N=50 flashcards et M=25 quiz, l'IA génère seulement ~12 flashcards et ~8 quiz.

## Contraintes
- Format JSON strict uniquement
- GPT-4o ou GPT-4o-mini
- max_tokens: 8000-16000
- Temperature: 0.3
- Corpus peut être tronqué à 120k chars

## Demande
Réécris ce prompt pour garantir que l'IA génère toujours le nombre exact demandé, même pour 50+ flashcards et 25+ quiz. Le prompt doit être efficace, clair et en français.




