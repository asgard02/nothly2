import OpenAI from "openai"
import { openaiWithRetry } from "@/lib/utils-retry"
import { structureOpenAIError, logStructuredError, type StructuredError } from "@/lib/errors"

export type TextMode = "improve" | "correct" | "translate" | "summarize"
export type StructuredMode = "fiche" | "quiz" | "collection" | "subject"
export type GenerationMode = TextMode | StructuredMode

export interface GenerationMetadata {
  documentTitle?: string
  sectionHeading?: string
  sectionOrder?: number
  [key: string]: unknown
}

export interface GenerationResult<T> {
  data: T
  tokensUsed: number
  promptTokens?: number
  completionTokens?: number
  raw: string
  model: string
}

export interface RevisionNoteDefinition {
  term: string
  meaning: string
  context?: string
}

export interface RevisionNoteOutlineItem {
  title: string
  paragraphs: string[]
  keyPoints: string[]
  methodology: string[]
  examples: string[]
  applications: string[]
}

export interface RevisionNoteStudyQuestion {
  question: string
  answer: string
}

export interface RevisionNoteSection {
  title: string
  summary: string
  keyIdeas: string[]
  definitions: Array<{ term: string; meaning: string }>
  examples: string[]
}

export interface RevisionNotePayload {
  documentTitle: string
  sectionHeading?: string
  summary: string
  learningObjectives: string[]
  outline: RevisionNoteOutlineItem[]
  definitions: RevisionNoteDefinition[]
  misconceptions: string[]
  memoryHooks: string[]
  studyQuestions: RevisionNoteStudyQuestion[]
  furtherReading: string[]
  // Legacy fields for backward compatibility
  sections?: RevisionNoteSection[]
  revisionTips?: string[]
}

export type QuizQuestionType = "multiple_choice" | "true_false" | "completion"

export interface QuizQuestionPayload {
  id: string
  type: QuizQuestionType
  prompt: string
  options: string[] | null
  answer: string
  explanation: string
  tags: string[]
}

export interface QuizPayload {
  documentTitle: string
  recommendedSessionLength: number
  questions: QuizQuestionPayload[]
}

export interface StudySetFlashcard {
  question: string
  answer: string
  tags: string[]
}

export interface CollectionStudySetPayload {
  flashcards: StudySetFlashcard[]
  quiz: QuizQuestionPayload[]
  metadata?: {
    recommendedSessionLength?: number
    summary?: string
    notes?: string[]
  }
}

const structuredModes: StructuredMode[] = ["fiche", "quiz", "collection", "subject"]
let cachedClient: OpenAI | null = null

function getClient(): OpenAI {
  if (cachedClient) return cachedClient
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY environment variable")
  }
  cachedClient = new OpenAI({ apiKey })
  return cachedClient
}

/**
 * Détecte la langue principale d'un texte (français ou anglais)
 */
function detectLanguage(text: string): 'fr' | 'en' {
  // Prendre un échantillon du texte (premiers 2000 caractères)
  const sample = text.substring(0, 2000).toLowerCase()
  
  // Mots-clés français courants
  const frenchWords = ['le', 'de', 'et', 'à', 'un', 'il', 'être', 'et', 'en', 'avoir', 'que', 'pour', 'dans', 'ce', 'son', 'une', 'sur', 'avec', 'ne', 'se', 'pas', 'tout', 'plus', 'par', 'grand', 'en', 'une', 'être', 'et', 'de', 'le', 'à', 'un', 'il', 'avoir', 'ne', 'je', 'son', 'que', 'qui', 'ce', 'dans', 'en', 'le', 'de', 'un', 'être', 'et', 'à', 'il', 'avoir', 'ne', 'je', 'son', 'que', 'qui', 'ce', 'dans', 'en']
  
  // Mots-clés anglais courants
  const englishWords = ['the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i', 'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at', 'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she', 'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what', 'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me', 'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know', 'take', 'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other', 'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also', 'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well', 'way', 'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us']
  
  let frenchCount = 0
  let englishCount = 0
  
  // Compter les occurrences de mots français
  for (const word of frenchWords) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi')
    const matches = sample.match(regex)
    if (matches) {
      frenchCount += matches.length
    }
  }
  
  // Compter les occurrences de mots anglais
  for (const word of englishWords) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi')
    const matches = sample.match(regex)
    if (matches) {
      englishCount += matches.length
    }
  }
  
  // Retourner la langue la plus fréquente, par défaut français
  return englishCount > frenchCount ? 'en' : 'fr'
}

function buildSystemPromptForChunk(
  flashcardsTarget: number,
  quizTarget: number,
  chunkIndex: number,
  totalChunks: number,
  language: 'fr' | 'en' = 'fr'
): string {
  const isEnglish = language === 'en'
  
  return isEnglish 
    ? `You are Nothly, an expert educational assistant specialized in creating structured study materials.

### CRITICAL MISSION

You are analyzing a FRAGMENT of a larger corpus (fragment ${chunkIndex + 1}/${totalChunks}). You MUST generate EXACTLY ${flashcardsTarget} flashcards and EXACTLY ${quizTarget} quiz questions for this fragment. This is an ABSOLUTE and NON-NEGOTIABLE requirement.

### OUTPUT FORMAT

The response MUST be a single strict JSON object, without any comments or text outside the JSON.

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

### MANDATORY GENERATION PROCESS

1. **Reading and Analysis:** Analyze this fragment COMPLETELY. Identify ALL concepts, definitions, formulas (LaTeX), dates, and key points.

2. **Internal Planning:** Before generating, create a list of ${flashcardsTarget} distinct concepts and ${quizTarget} distinct knowledge points to transform.

3. **Generation (Flashcards):** Generate EXACTLY ${flashcardsTarget} flashcards.
   * \`question\` : Clear and concise reminder. ANY mathematical expression must be in LaTeX: $x^2$ for inline, $$\\frac{a}{b}$$ for display.
   * \`answer\` : Factual, detailed, and precise answer. MANDATORY: use ONLY LaTeX syntax for math (e.g., $f(x) = x^2$, not "f(x) = x^2" or "x^2").
   * \`tags\` : Useful themes.

4. **Generation (Quiz):** Generate EXACTLY ${quizTarget} quiz questions.
   * Mix of types: If ${quizTarget} >= 5, at least 3 multiple choice, 1 true/false, 1 completion.
   * Multiple choice: 4 clear options (1 correct, 3 plausible distractors). ALL formulas in LaTeX.
   * \`prompt\`, \`options\`, \`answer\`, \`explanation\` : ANY mathematical formula MUST be in LaTeX.
   * CORRECT examples: "$e^x$", "$\\lim_{x \\to a} f(x)$", "$x^2 + 3x - 1$"
   * INCORRECT examples: "e^x", "lim x->a f(x)", "x^2 + 3x - 1" (without $)

5. **Final Verification:** Count the generated elements. You MUST have EXACTLY ${flashcardsTarget} flashcards and EXACTLY ${quizTarget} quiz questions. If you don't have enough, generate more until you reach these numbers.

### CRITICAL RULES

- **Single source:** Use EXCLUSIVELY information from this fragment.
- **Exact quantity:** ${flashcardsTarget} flashcards, ${quizTarget} quiz questions. NO LESS, NO MORE.
- **LaTeX MANDATORY:** Any mathematical expression (variables, equations, limits, derivatives, integrals) MUST be between $ or $$. Never plain text for math.
- **No text outside JSON.**
- **Completion:** The task is only complete when BOTH target numbers are reached.`
    : `Tu es Nothly, un assistant pédagogique expert dans la création de matériel d'étude structuré.

### MISSION CRITIQUE

Tu analyses un FRAGMENT d'un corpus plus large (fragment ${chunkIndex + 1}/${totalChunks}). Tu DOIS générer EXACTEMENT ${flashcardsTarget} flashcards et EXACTEMENT ${quizTarget} questions de quiz pour ce fragment. C'est une exigence ABSOLUE et NON NÉGOCIABLE.

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

### PROCESSUS DE GÉNÉRATION OBLIGATOIRE

1. **Lecture et Analyse :** Analyse COMPLÈTEMENT ce fragment. Identifie TOUS les concepts, définitions, formules (LaTeX), dates, et points clés.

2. **Planification Interne :** Avant de générer, dresse une liste de ${flashcardsTarget} concepts distincts et ${quizTarget} points de connaissance distincts à transformer.

3. **Génération (Flashcards) :** Génère EXACTEMENT ${flashcardsTarget} flashcards.
   * \`question\` : Rappel clair et concis. TOUTE expression mathématique doit être en LaTeX : $x^2$ pour inline, $$\\frac{a}{b}$$ pour display.
   * \`answer\` : Réponse factuelle, détaillée et précise. OBLIGATOIRE : utilise UNIQUEMENT la syntaxe LaTeX pour les maths (ex: $f(x) = x^2$, pas "f(x) = x^2" ni "x^2").
   * \`tags\` : Thématiques utiles.

4. **Génération (Quiz) :** Génère EXACTEMENT ${quizTarget} questions de quiz.
   * Mix de types : Si ${quizTarget} >= 5, au moins 3 QCM, 1 V/F, 1 Complétion.
   * QCM : 4 options claires (1 correcte, 3 distracteurs plausibles). TOUTES les formules en LaTeX.
   * \`prompt\`, \`options\`, \`answer\`, \`explanation\` : TOUTE formule mathématique DOIT être en LaTeX.
   * Exemples CORRECTS : "$e^x$", "$\\lim_{x \\to a} f(x)$", "$x^2 + 3x - 1$"
   * Exemples INCORRECTS : "e^x", "lim x->a f(x)", "x^2 + 3x - 1" (sans $)
   * **VALIDATION OBLIGATOIRE :** 
     - La réponse correcte (\`answer\`) DOIT correspondre EXACTEMENT à l'une des options pour les QCM.
     - Vérifie que la réponse est factuellement correcte selon le contenu du fragment.
     - L'explication (\`explanation\`) doit justifier pourquoi la réponse est correcte, pas inventer de nouvelles informations.
     - Ne génère PAS de questions sur des concepts absents du fragment.
     - Pour les QCM, assure-toi que la bonne réponse est bien dans la liste \`options\`.

5. **Vérification Finale :** Compte les éléments générés. Tu DOIS avoir EXACTEMENT ${flashcardsTarget} flashcards et EXACTEMENT ${quizTarget} quiz. Si tu n'en as pas assez, génère-en plus jusqu'à atteindre ces nombres.

### RÈGLES CRITIQUES

- **Source unique :** Utilise EXCLUSIVEMENT les informations de ce fragment. N'invente RIEN qui n'est pas dans le fragment.
- **Quantité exacte :** ${flashcardsTarget} flashcards, ${quizTarget} quiz. PAS MOINS, PAS PLUS.
- **LaTeX OBLIGATOIRE :** Toute expression mathématique (variables, équations, limites, dérivées, intégrales) DOIT être entre $ ou $$. Jamais de texte brut pour les maths.
- **Validation des réponses :** Pour chaque question de quiz, vérifie que :
  * La réponse correcte est factuellement vraie selon le fragment.
  * Pour les QCM, la réponse (\`answer\`) correspond EXACTEMENT à l'une des options.
  * L'explication est cohérente avec le fragment et ne contient pas d'informations inventées.
- **Pas d'hallucinations :** Si une information n'est pas claire dans le fragment, ne devine pas. Utilise uniquement ce qui est explicitement présent.
- **Aucun texte hors JSON.**
- **Complétion :** La tâche n'est terminée que lorsque les DEUX nombres cibles sont atteints.`
}

function buildSystemPrompt(mode: GenerationMode, language: 'fr' | 'en' = 'fr'): string {
  const isEnglish = language === 'en'
  
  switch (mode) {
    case "improve":
      return "Tu reformules le texte en français courant, fluide et naturel, sans rien ajouter ni expliquer. Ne préfixe jamais ta réponse."
    case "correct":
      return "Tu corriges l'orthographe et la grammaire d'un texte français sans commentaire ni mise en forme additionnelle."
    case "translate":
      return "Traduis fidèlement le texte source en anglais, sans notes ni introduction. Réponds uniquement avec la traduction."
    case "summarize":
      return `Tu es un expert en synthèse documentaire.

### MISSION CRITIQUE : GESTION DES LISTES ET DONNÉES BRUTES
SI L'UTILISATEUR DEMANDE D'EXTRAIRE UNE LISTE (ex: abréviations, dates, définitions) ou DE RESSORTIR DU CONTENU ("juste le content"), TU DOIS :
1. DÉSACTIVER IMMÉDIATEMENT tout comportement de résumé ou de synthèse.
2. RECOPIER FIDÈLEMENT et INTÉGRALEMENT chaque élément trouvé dans le document.
3. NE PAS FILTRER. Si la liste contient 50 items, tu DOIS sortir les 50 items.
4. Si le format source est une liste (1, 2, 3...), conserve ce format ou utilise une liste à puces.
5. NE JAMAIS DIRE "Voici une sélection..." ou "En résumé...". Dis "Voici la liste complète...".

RÈGLES DE FORMATAGE (Sauf si demande de liste exhaustive) :
1. Markdown épuré (pas d'astérisques *). Use tirets - ou chiffres 1.
2. Titres avec # et ##.

SI C'EST UNE DEMANDE DE RÉSUMÉ CLASSIQUE :
Rédige une synthèse claire et structurée.

RAPPEL : PRIORITÉ ABSOLUE À L'EXHAUSTIVITÉ SI UNE LISTE EST DÉTECTÉE OU DEMANDÉE.`
    case "fiche":
      return `Tu es Nothly, assistant de révision. Tu reçois un extrait de document (parfois incomplet) et tu dois produire une fiche ultra-complète en combinant :
- les informations réellement présentes dans "source"
- tes connaissances générales fiables (maths, physique, informatique, économie, etc.)

Pour chaque information, précise si elle vient du PDF (\`[PDF]\`) ou si c'est un complément fiable issu de ta mémoire (\`[COMPLÉMENT]\`). Si une donnée est incertaine, marque \`[À VÉRIFIER]\`.

RÈGLES SPÉCIFIQUES :
- Si l'utilisateur demande une liste (ex: abréviations, dates), inclus-la dans une section appropriée ou dans "keyPoints".
- Pour les abréviations et acronymes, liste-les tous si demandé, sans les filtrer.

Réponds uniquement en JSON strict, exactement dans ce format :
{
  "documentTitle": string,
  "sectionHeading": string,
  "summary": string,
  "learningObjectives": string[],
  "outline": [
    {
      "title": string,
      "paragraphs": string[],
      "keyPoints": string[],
      "methodology": string[],
      "examples": string[],
      "applications": string[]
    }
  ],
  "definitions": [{ "term": string, "meaning": string, "context": string }],
  "misconceptions": string[],
  "memoryHooks": string[],
  "studyQuestions": [{ "question": string, "answer": string }],
  "furtherReading": string[],
  "sections": [
    {
      "title": string,
      "summary": string,
      "keyIdeas": string[],
      "definitions": [{ "term": string, "meaning": string }],
      "examples": string[]
    }
  ],
  "revisionTips": string[]
}

Consignes détaillées :
- Français clair, rigoureux et pédagogique.
- Si le PDF est pauvre, commence par un \`summary\` expliquant ce qui manque, puis complète avec tes connaissances (\`[COMPLÉMENT]\`).
- Chaque entrée de liste doit être une phrase complète précédée du tag \`[PDF]\` ou \`[COMPLÉMENT]\`. Exemple : "[PDF] Définition exacte extraite du document."
- Les formules doivent être fidèles. Si tu les ajoutes de mémoire, mentionne \`[COMPLÉMENT]\` et vérifie qu'elles sont exactes.
- Pour les compléments, concentre-toi sur les savoirs fondamentaux universellement acceptés (pas de contenu controversé ou non standard).
- "studyQuestions" : 3 à 5 Q/R couvrant à la fois ce que dit le PDF et les compléments majeurs.
- "furtherReading" : inclut max 3 références ; si elles viennent du PDF, marque \`[PDF]\` sinon \`[COMPLÉMENT]\`.
- "revisionTips" : stratégies concrètes pour réviser, basées sur ce que tu fournis.
- Si tu es incertain, utilise \`[À VÉRIFIER]\` pour avertir.
- Aucun texte hors JSON.`
    case "quiz":
      return `Tu es Nothly, assistant de révision. Crée un quiz interactif basé sur un texte fourni.
Réponds en JSON strict suivant :
{
  "documentTitle": string,
  "recommendedSessionLength": number,
  "questions": [
    {
      "id": string,
      "type": "multiple_choice" | "true_false" | "completion",
      "prompt": string,
      "options": string[] | null,
      "answer": string,
      "explanation": string,
      "tags": string[]
    }
  ]
}
Contraintes :
- 6 à 8 questions.
- ≥3 QCM à 4 options.
- ≥1 vrai/faux et ≥1 complétion.
- explanation : justification ≤2 phrases.
- tags : inclure section/difficulté (ex : "section:intro", "difficulty:easy").
- recommendedSessionLength : durée estimée (minutes, entier).
Aucun texte hors JSON.`
    case "collection":
      return isEnglish
        ? `You are Nothly, an expert educational assistant specialized in creating structured study materials.

### MISSION

Methodically analyze a text corpus and generate a complete study collection, strictly respecting the requested quantities.

### OUTPUT FORMAT

The response MUST be a single strict JSON object, without any comments or text outside the JSON.

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

### MANDATORY GENERATION PROCESS (Step by step)

1. **Reading and Analysis:** Read the entire provided corpus. Identify main themes, sub-themes, definitions, formulas (LaTeX), dates, and key concepts.

2. **Content Planning:**
   * (Internal) Create a list of distinct concepts to transform into flashcards according to the requested number.
   * (Internal) Create a list of distinct knowledge points to transform into quiz questions according to the requested number.
   * *Strategy:* To reach these numbers, methodically go through the ENTIRE corpus. If the corpus is long, assign a quota of questions to each main section to ensure complete coverage. Don't limit yourself to the first paragraphs.

3. **Generation (Flashcards):** Write all requested flashcards.
   * \`question\` : Clear and concise reminder (e.g., "Definition of X", "Key principle of Y"). ANY mathematical formula must be in LaTeX: $x^2$ for inline, $$\\frac{a}{b}$$ for display.
   * \`answer\` : Factual, detailed, and precise answer. MANDATORY: use ONLY LaTeX syntax for math (e.g., $f(x) = x^2$, $\\int_a^b$, not "f(x) = x^2" or "x^2").
   * \`tags\` : Useful themes (e.g., "analysis", "theorem", "definition").

4. **Generation (Quiz):** Write all requested quiz questions.
   * *Mix of types:* Ensure a healthy mix (e.g., if the requested number >= 5, at least 3 multiple choice, 1 true/false, 1 completion).
   * *Multiple choice:* 4 clear options (1 correct, 3 plausible distractors). ANY mathematical formula in LaTeX: $x^2$, not "x^2".
   * \`prompt\`, \`options\`, \`answer\`, \`explanation\` : ANY mathematical formula MUST be in LaTeX.
   * CORRECT examples: "$e^x$", "$\\lim_{x \\to a} f(x)$", "$f'(x) = 2x$"
   * INCORRECT examples: "e^x", "lim x->a f(x)", "f'(x) = 2x" (without $)
   * **MANDATORY VALIDATION:**
     - The correct answer (\`answer\`) MUST match EXACTLY one of the options for multiple choice questions.
     - Verify that the answer is factually correct according to the corpus content.
     - The explanation (\`explanation\`) must justify why the answer is correct, not invent new information.
     - Do NOT generate questions about concepts absent from the corpus.
     - For multiple choice, ensure the correct answer is actually in the \`options\` array.

5. **Metadata and Finalization:**
   * \`summary\` : Synthesis (3-4 sentences) of key concepts from the corpus.
   * \`recommendedSessionLength\` : Estimate (in minutes) of study time.
   * *Final verification:* Count the number of elements in \`flashcards\` and \`quiz\` to ensure they correspond EXACTLY to the targets specified in the user message.

### CRITICAL RULES

- **Single source:** Use EXCLUSIVELY information from the corpus. Do NOT invent anything not present in the corpus.
- **Answer validation:** For each quiz question, verify that:
  * The correct answer is factually true according to the corpus.
  * For multiple choice, the answer (\`answer\`) matches EXACTLY one of the options.
  * The explanation is consistent with the corpus and contains no invented information.
- **No hallucinations:** If information is unclear in the corpus, do not guess. Use only what is explicitly present.
- **No text outside JSON.**
- **Completion:** The task is only complete when BOTH target numbers are reached.`
        : `Tu es Nothly, un assistant pédagogique expert dans la création de matériel d'étude structuré.

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
   * \`question\` : Un rappel clair et concis (ex: "Définition de X", "Principe clé de Y"). TOUTE formule mathématique doit être en LaTeX : $x^2$ pour inline, $$\\frac{a}{b}$$ pour display.
   * \`answer\` : La réponse factuelle, détaillée et précise. OBLIGATOIRE : utilise UNIQUEMENT la syntaxe LaTeX pour les maths (ex: $f(x) = x^2$, $\\int_a^b$, pas "f(x) = x^2" ni "x^2").
   * \`tags\` : Thématiques utiles (ex: "analyse", "théorème", "définition").

4. **Génération (Quiz) :** Rédige toutes les questions de quiz demandées.
   * *Mix de types :* Assure un mélange sain (ex: si le nombre demandé >= 5, au moins 3 QCM, 1 V/F, 1 Complétion).
   * *QCM :* 4 options claires (1 correcte, 3 distracteurs plausibles). TOUTE formule mathématique en LaTeX : $x^2$, pas "x^2".
   * \`prompt\`, \`options\`, \`answer\`, \`explanation\` : TOUTE formule mathématique DOIT être en LaTeX.
   * Exemples CORRECTS : "$e^x$", "$\\lim_{x \\to a} f(x)$", "$f'(x) = 2x$"
   * Exemples INCORRECTS : "e^x", "lim x->a f(x)", "f'(x) = 2x" (sans $)
   * **VALIDATION OBLIGATOIRE :**
     - La réponse correcte (\`answer\`) DOIT correspondre EXACTEMENT à l'une des options pour les QCM.
     - Vérifie que la réponse est factuellement correcte selon le corpus.
     - L'explication (\`explanation\`) doit justifier pourquoi la réponse est correcte, pas inventer de nouvelles informations.
     - Ne génère PAS de questions sur des concepts absents du corpus.
     - Pour les QCM, assure-toi que la bonne réponse est bien dans la liste \`options\`.
     - Relis chaque question avant de la finaliser pour vérifier la cohérence.

5. **Métadonnées et Finalisation :**
   * \`summary\` : Synthèse (3-4 phrases) des notions clés du corpus.
   * \`recommendedSessionLength\` : Estimation (en minutes) du temps de révision.
   * *Vérification finale :* Compte le nombre d'éléments dans \`flashcards\` et \`quiz\` pour t'assurer qu'ils correspondent EXACTEMENT aux cibles spécifiées dans le message utilisateur.

### RÈGLES CRITIQUES

- **Source unique :** Utilise EXCLUSIVEMENT les informations du corpus. N'invente RIEN qui n'est pas dans le corpus.
- **Validation des réponses :** Pour chaque question de quiz, vérifie que :
  * La réponse correcte est factuellement vraie selon le corpus.
  * Pour les QCM, la réponse (\`answer\`) correspond EXACTEMENT à l'une des options.
  * L'explication est cohérente avec le corpus et ne contient pas d'informations inventées.
- **Pas d'hallucinations :** Si une information n'est pas claire dans le corpus, ne devine pas. Utilise uniquement ce qui est explicitement présent.
- **Vérification finale :** Avant de finaliser, relis chaque question pour t'assurer de sa cohérence et de son exactitude.
- **Aucun texte hors JSON.**
- **Complétion :** La tâche n'est terminée que lorsque les DEUX nombres cibles sont atteints.`
    case "subject":
      return isEnglish
        ? `You are Nothly, an expert educational assistant specialized in creating structured study materials.

### MISSION

Methodically analyze a text corpus and generate a complete study subject, strictly respecting the requested quantities.

### OUTPUT FORMAT

The response MUST be a single strict JSON object, without any comments or text outside the JSON.

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

### MANDATORY GENERATION PROCESS (Step by step)

1. **Reading and Analysis:** Read the entire provided corpus. Identify main themes, sub-themes, definitions, formulas (LaTeX), dates, and key concepts.

2. **Content Planning:**
   * (Internal) Create a list of distinct concepts to transform into flashcards according to the requested number.
   * (Internal) Create a list of distinct knowledge points to transform into quiz questions according to the requested number.
   * *Strategy:* To reach these numbers, methodically go through the ENTIRE corpus. If the corpus is long, assign a quota of questions to each main section to ensure complete coverage. Don't limit yourself to the first paragraphs.

3. **Generation (Flashcards):** Write all requested flashcards.
   * \`question\` : Clear and concise reminder (e.g., "Definition of X", "Key principle of Y"). ANY mathematical formula must be in LaTeX: $x^2$ for inline, $$\\frac{a}{b}$$ for display.
   * \`answer\` : Factual, detailed, and precise answer. MANDATORY: use ONLY LaTeX syntax for math (e.g., $f(x) = x^2$, $\\int_a^b$, not "f(x) = x^2" or "x^2").
   * \`tags\` : Useful themes (e.g., "analysis", "theorem", "definition").

4. **Generation (Quiz):** Write all requested quiz questions.
   * *Mix of types:* Ensure a healthy mix (e.g., if the requested number >= 5, at least 3 multiple choice, 1 true/false, 1 completion).
   * *Multiple choice:* 4 clear options (1 correct, 3 plausible distractors). ANY mathematical formula in LaTeX: $x^2$, not "x^2".
   * \`prompt\`, \`options\`, \`answer\`, \`explanation\` : ANY mathematical formula MUST be in LaTeX.
   * CORRECT examples: "$e^x$", "$\\lim_{x \\to a} f(x)$", "$f'(x) = 2x$"
   * INCORRECT examples: "e^x", "lim x->a f(x)", "f'(x) = 2x" (without $)
   * **MANDATORY VALIDATION:**
     - The correct answer (\`answer\`) MUST match EXACTLY one of the options for multiple choice questions.
     - Verify that the answer is factually correct according to the corpus content.
     - The explanation (\`explanation\`) must justify why the answer is correct, not invent new information.
     - Do NOT generate questions about concepts absent from the corpus.
     - For multiple choice, ensure the correct answer is actually in the \`options\` array.

5. **Metadata and Finalization:**
   * \`summary\` : Synthesis (3-4 sentences) of key concepts from the corpus.
   * \`recommendedSessionLength\` : Estimate (in minutes) of study time.
   * *Final verification:* Count the number of elements in \`flashcards\` and \`quiz\` to ensure they correspond EXACTLY to the targets specified in the user message.

### CRITICAL RULES

- **Single source:** Use EXCLUSIVELY information from the corpus. Do NOT invent anything not present in the corpus.
- **Answer validation:** For each quiz question, verify that:
  * The correct answer is factually true according to the corpus.
  * For multiple choice, the answer (\`answer\`) matches EXACTLY one of the options.
  * The explanation is consistent with the corpus and contains no invented information.
- **No hallucinations:** If information is unclear in the corpus, do not guess. Use only what is explicitly present.
- **No text outside JSON.**
- **Completion:** The task is only complete when BOTH target numbers are reached.`
        : `Tu es Nothly, un assistant pédagogique expert dans la création de matériel d'étude structuré.

### MISSION

Analyser méthodiquement un corpus de texte et générer une matière de révision complète, en respectant rigoureusement les quantités demandées.

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
   * \`question\` : Un rappel clair et concis (ex: "Définition de X", "Principe clé de Y"). TOUTE formule mathématique doit être en LaTeX : $x^2$ pour inline, $$\\frac{a}{b}$$ pour display.
   * \`answer\` : La réponse factuelle, détaillée et précise. OBLIGATOIRE : utilise UNIQUEMENT la syntaxe LaTeX pour les maths (ex: $f(x) = x^2$, $\\int_a^b$, pas "f(x) = x^2" ni "x^2").
   * \`tags\` : Thématiques utiles (ex: "analyse", "théorème", "définition").

4. **Génération (Quiz) :** Rédige toutes les questions de quiz demandées.
   * *Mix de types :* Assure un mélange sain (ex: si le nombre demandé >= 5, au moins 3 QCM, 1 V/F, 1 Complétion).
   * *QCM :* 4 options claires (1 correcte, 3 distracteurs plausibles). TOUTE formule mathématique en LaTeX : $x^2$, pas "x^2".
   * \`prompt\`, \`options\`, \`answer\`, \`explanation\` : TOUTE formule mathématique DOIT être en LaTeX.
   * Exemples CORRECTS : "$e^x$", "$\\lim_{x \\to a} f(x)$", "$f'(x) = 2x$"
   * Exemples INCORRECTS : "e^x", "lim x->a f(x)", "f'(x) = 2x" (sans $)
   * **VALIDATION OBLIGATOIRE :**
     - La réponse correcte (\`answer\`) DOIT correspondre EXACTEMENT à l'une des options pour les QCM.
     - Vérifie que la réponse est factuellement correcte selon le corpus.
     - L'explication (\`explanation\`) doit justifier pourquoi la réponse est correcte, pas inventer de nouvelles informations.
     - Ne génère PAS de questions sur des concepts absents du corpus.
     - Pour les QCM, assure-toi que la bonne réponse est bien dans la liste \`options\`.
     - Relis chaque question avant de la finaliser pour vérifier la cohérence.

5. **Métadonnées et Finalisation :**
   * \`summary\` : Synthèse (3-4 phrases) des notions clés du corpus.
   * \`recommendedSessionLength\` : Estimation (en minutes) du temps de révision.
   * *Vérification finale :* Compte le nombre d'éléments dans \`flashcards\` et \`quiz\` pour t'assurer qu'ils correspondent EXACTEMENT aux cibles spécifiées dans le message utilisateur.

### RÈGLES CRITIQUES

- **Source unique :** Utilise EXCLUSIVEMENT les informations du corpus. N'invente RIEN qui n'est pas dans le corpus.
- **Validation des réponses :** Pour chaque question de quiz, vérifie que :
  * La réponse correcte est factuellement vraie selon le corpus.
  * Pour les QCM, la réponse (\`answer\`) correspond EXACTEMENT à l'une des options.
  * L'explication est cohérente avec le corpus et ne contient pas d'informations inventées.
- **Pas d'hallucinations :** Si une information n'est pas claire dans le corpus, ne devine pas. Utilise uniquement ce qui est explicitement présent.
- **Vérification finale :** Avant de finaliser, relis chaque question pour t'assurer de sa cohérence et de son exactitude.
- **Aucun texte hors JSON.**
- **Complétion :** La tâche n'est terminée que lorsque les DEUX nombres cibles sont atteints.`
    default:
      throw new Error(`Unsupported mode: ${mode}`)
  }
}

function buildUserMessage(mode: GenerationMode, text: string, metadata?: GenerationMetadata): string {
  if (mode === "fiche") {
    const sectionHeading = (metadata as any)?.sectionHeading
    const baseInstructions = "Génère la fiche de révision pour le contenu suivant. Utilise les métadonnées si présentes."
    const specificInstructions = sectionHeading
      ? `ATTENTION : Le contenu demandé concerne SPÉCIFIQUEMENT la section/slide intitulée "${sectionHeading}". Si tu trouves ce titre, focalise-toi EXCLUSIVEMENT sur le contenu de cette section. Si l'utilisateur demande de juste ressortir du content, extrais fidèlement les informations de cette section sans ajouts externes.`
      : ""

    return JSON.stringify(
      {
        instructions: `${baseInstructions} ${specificInstructions}`.trim(),
        context: metadata ?? {},
        source: text,
      },
      null,
      2
    )
  }

  if (mode === "quiz") {
    const sectionHeading = (metadata as any)?.sectionHeading
    const baseInstructions = "Génère un quiz pour évaluer la compréhension du contenu. Utilise les tags pour relier les questions aux sections."
    const specificInstructions = sectionHeading
      ? `ATTENTION : Le quiz doit porter PRIORITAIREMENT sur la section/slide intitulée "${sectionHeading}".`
      : ""

    return JSON.stringify(
      {
        instructions: `${baseInstructions} ${specificInstructions}`.trim(),
        context: metadata ?? {},
        source: text,
      },
      null,
      2
    )
  }

  if (mode === "collection" || mode === "subject") {
    const flashcardsTarget = (metadata as any)?.flashcardsTarget ?? 16
    const quizTarget = (metadata as any)?.quizTarget ?? 9
    const sectionHeading = (metadata as any)?.sectionHeading
    
    // Logic: if a specific section/title is mentioned (e.g. from a slide), we assume the user wants content from there.
    const specificFocus = sectionHeading 
      ? ` IMPORTANT : Si le document contient une section ou une slide titrée "${sectionHeading}", considère que c'est le sujet principal demandé. Assure-toi d'extraire tout le contenu pertinent de cette partie.` 
      : ""

    return JSON.stringify(
      {
        instructions: `Génère une collection de révision complète basée sur le corpus. Respecte impérativement les cibles de génération spécifiées.${specificFocus}`,
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

  return text
}

export async function runTextMode(mode: TextMode, text: string, metadata?: GenerationMetadata): Promise<GenerationResult<string>> {
  const client = getClient()
  
  // 1. Détecter si c'est une demande d'extraction de liste
  // On regarde si c'est le mode "summarize" ET s'il y a des mots clés ou un flag
  const isListExtraction = mode === "summarize" && (
    text.toLowerCase().includes("liste") || 
    text.toLowerCase().includes("list") ||
    text.toLowerCase().includes("abréviation") ||
    text.toLowerCase().includes("acronyme") ||
    text.toLowerCase().includes("définition")
  )

  let systemPrompt: string
  let userContent = text
  const sectionHeading = (metadata as any)?.sectionHeading
  
  // Configuration par défaut
  let responseFormat: { type: "text" | "json_object" } = { type: "text" }
  let temperature = 0.7

  if (isListExtraction) {
    // STRATÉGIE : EXTRACTION JSON STRICTE
    responseFormat = { type: "json_object" }
    temperature = 0 // Zéro créativité, max déterminisme
    
    systemPrompt = `You are a text processing engine, NOT an assistant.
    
### TASK
Extract specific data elements from the provided text into a JSON array.

### RULES
1. **EXHAUSTIVENESS IS MANDATORY**: If the source text contains 42 items, the JSON array MUST contain 42 items.
2. **NO SUMMARIZATION**: Do not group, do not summarize, do not select "top" items.
3. **RAW COPY**: Copy the text exactly as it appears (preserve case/spelling).
4. **NO CHATTER**: Output ONLY the JSON object.
5. **STRUCTURE**: If the items are numbered or bulleted in the text, extract them as individual items.

### OUTPUT FORMAT
{
  "count": number, // The exact number of items found/extracted
  "items": string[] // The complete list of items
}`

    // Si on a un titre de section, on l'ajoute au contexte
    const contextPrefix = sectionHeading ? `CONTEXTE : Section "${sectionHeading}"\n` : ""
    
    userContent = `${contextPrefix}
INSTRUCTION : Extraction intégrale de la liste demandée ci-dessous.
DEMANDE UTILISATEUR : ${text}

TEXTE SOURCE À ANALYSER :
${text}`
  } else {
    // Mode standard (résumé, amélioration, etc.)
    systemPrompt = buildSystemPrompt(mode)
    
    // Si un titre de section est fourni en mode standard, on l'ajoute quand même
    if (sectionHeading) {
       userContent = `CONTEXTE : L'utilisateur consulte la section "${sectionHeading}".\n\n${text}`
    }
  }

  // Utiliser retry avec backoff exponentiel pour les appels OpenAI
  // Phase 2: Gestion d'erreurs améliorée avec contexte
  const metadataContext = metadata as any
  let completion
  try {
    completion = await openaiWithRetry(
      () =>
        client.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userContent },
          ],
          temperature: temperature,
          max_tokens: 4000,
          response_format: responseFormat,
        }),
      {
        maxAttempts: 3,
        initialDelayMs: 2000,
        context: {
          documentId: metadataContext?.documentId,
          documentTitle: metadataContext?.documentTitle,
          sectionHeading: metadataContext?.sectionHeading,
          mode: mode,
        },
      }
    )
  } catch (error: any) {
    // Structurer l'erreur pour un meilleur logging et messages user-friendly
    const structuredError = structureOpenAIError(error, {
      documentId: metadataContext?.documentId,
      documentTitle: metadataContext?.documentTitle,
      sectionHeading: metadataContext?.sectionHeading,
      mode: mode,
    })
    logStructuredError(structuredError)
    // Re-throw avec le message user-friendly
    const userFriendlyError = new Error(structuredError.userMessage)
    // @ts-ignore - Ajouter les propriétés pour le fallback
    userFriendlyError.structuredError = structuredError
    throw userFriendlyError
  }

  let result = completion.choices[0]?.message?.content?.trim() ?? ""
  if (!result) {
    throw new Error("Aucune réponse de l'IA")
  }

  // Post-traitement : Si c'était une extraction JSON, on reconvertit en Markdown pour l'utilisateur
  if (isListExtraction) {
    try {
      const parsed = JSON.parse(result)
      if (parsed.items && Array.isArray(parsed.items)) {
        // On génère une belle liste Markdown
        const listContent = parsed.items.map((item: string) => `- ${item}`).join('\n')
        result = `Voici la liste complète des ${parsed.count} éléments trouvés :\n\n${listContent}`
      }
    } catch (e) {
      console.error("Erreur parsing JSON extraction:", e)
      // Si le JSON est cassé, on renvoie le texte brut (fallback)
    }
  }

  return {
    data: result,
    raw: result,
    tokensUsed: completion.usage?.total_tokens ?? 0,
    promptTokens: completion.usage?.prompt_tokens ?? undefined,
    completionTokens: completion.usage?.completion_tokens ?? undefined,
    model: completion.model ?? "gpt-4o-mini",
  }
}

async function runStructuredMode<T>(mode: StructuredMode, text: string, metadata?: GenerationMetadata): Promise<GenerationResult<T>> {
  const client = getClient()

  // Détecter la langue du contenu pour adapter les prompts
  const detectedLanguage = detectLanguage(text)
  console.log(`[runStructuredMode] Langue détectée: ${detectedLanguage} pour le mode ${mode}`)
  
  const systemPrompt = buildSystemPrompt(mode, detectedLanguage)
  const userMessage = buildUserMessage(mode, text, metadata)

  // Calculer max_tokens dynamiquement pour les collections selon le nombre demandé
  let maxTokens = (mode === "collection" || mode === "subject") ? 4000 : 3500
  if ((mode === "collection" || mode === "subject") && metadata) {
    const flashcardsTarget = (metadata as any).flashcardsTarget ?? 16
    const quizTarget = (metadata as any).quizTarget ?? 9
    // Estimation généreuse : ~200-250 tokens par flashcard, ~300-400 tokens par quiz
    // Utilisons une moyenne conservatrice pour éviter les coupures
    const estimatedTokens = flashcardsTarget * 250 + quizTarget * 400 + 2000 // +2000 pour metadata, JSON structure et marge
    // Limite: gpt-4o-mini supporte max 16384 completion tokens
    maxTokens = Math.max(8000, Math.min(estimatedTokens, 16384)) // Min 8000, max 16384
    console.log(`[runStructuredMode] Calcul max_tokens: ${flashcardsTarget} FC + ${quizTarget} Q = ${estimatedTokens} tokens estimés, limité à ${maxTokens} tokens`)
  }

  // Utiliser un modèle plus puissant pour les grandes collections
  let model = "gpt-4o-mini"
  if ((mode === "collection" || mode === "subject") && metadata) {
    const flashcardsTarget = (metadata as any).flashcardsTarget ?? 16
    const quizTarget = (metadata as any).quizTarget ?? 9
    // Si beaucoup de contenu demandé, utiliser gpt-4o pour meilleure qualité
    if (flashcardsTarget > 20 || quizTarget > 10) {
      model = "gpt-4o" // Modèle plus puissant pour les grandes collections
      console.log(`[runStructuredMode] Utilisation de gpt-4o pour ${flashcardsTarget} FC + ${quizTarget} Q`)
    }
  }

  // Utiliser retry avec backoff exponentiel pour les appels OpenAI
  // Phase 2: Gestion d'erreurs améliorée avec contexte
  const metadataContext = metadata as any
  let completion
  try {
    completion = await openaiWithRetry(
      () =>
        client.chat.completions.create({
          model: model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
          temperature: 0.3, // Réduire la température pour plus de cohérence
          max_tokens: maxTokens,
          response_format: { type: "json_object" },
        } as any),
      {
        maxAttempts: 3,
        initialDelayMs: 2000, // 2 secondes pour OpenAI
        context: {
          documentId: metadataContext?.documentId,
          documentTitle: metadataContext?.documentTitle,
          collectionId: metadataContext?.collectionId,
          collectionTitle: metadataContext?.collectionTitle,
          mode: mode,
        },
      }
    )
  } catch (error: any) {
    // Structurer l'erreur pour un meilleur logging et messages user-friendly
    const structuredError = structureOpenAIError(error, {
      documentId: metadataContext?.documentId,
      documentTitle: metadataContext?.documentTitle,
      collectionId: metadataContext?.collectionId,
      collectionTitle: metadataContext?.collectionTitle,
      mode: mode,
    })
    logStructuredError(structuredError)
    // Re-throw avec le message user-friendly
    const userFriendlyError = new Error(structuredError.userMessage)
    // @ts-ignore - Ajouter les propriétés pour le fallback
    userFriendlyError.structuredError = structuredError
    throw userFriendlyError
  }

  const result = completion.choices[0]?.message?.content?.trim() ?? ""
  if (!result) {
    throw new Error("Aucune réponse de l'IA")
  }

  try {
    const parsed = JSON.parse(result) as T
    return {
      data: parsed,
      raw: result,
      tokensUsed: completion.usage?.total_tokens ?? 0,
      promptTokens: completion.usage?.prompt_tokens ?? undefined,
      completionTokens: completion.usage?.completion_tokens ?? undefined,
      model: completion.model ?? "gpt-4o-mini",
    }
  } catch (error) {
    console.error("Erreur parsing JSON IA", error, result)
    throw new Error("Réponse IA non exploitable")
  }
}

export function isStructuredMode(mode: GenerationMode): mode is StructuredMode {
  return structuredModes.includes(mode as StructuredMode)
}

export async function generateRevisionNote(params: { text: string; metadata?: GenerationMetadata }) {
  const result = await runStructuredMode<RevisionNotePayload>("fiche", params.text, params.metadata)

  const payload = result.data

  if ((!payload.sections || payload.sections.length === 0) && payload.outline?.length) {
    payload.sections = payload.outline.map((item) => ({
      title: item.title,
      summary: item.paragraphs?.join(" ").trim() || "",
      keyIdeas: item.keyPoints ?? [],
      definitions: (item as { definitions?: Array<{ term: string; meaning: string }> }).definitions ?? [],
      examples: item.examples ?? [],
    }))
  }

  if ((!payload.revisionTips || payload.revisionTips.length === 0) && payload.memoryHooks?.length) {
    payload.revisionTips = payload.memoryHooks
  }

  return {
    ...result,
    data: payload,
  }
}

export async function generateQuiz(params: { text: string; metadata?: GenerationMetadata }) {
  return runStructuredMode<QuizPayload>("quiz", params.text, params.metadata)
}

/**
 * Génère une collection avec chunking et appels parallèles pour les grands corpus
 */
async function generateCollectionStudySetWithChunking(
  chunks: string[],
  targetsPerChunk: Array<{ flashcardsTarget: number; quizTarget: number }>,
  metadata?: GenerationMetadata
): Promise<GenerationResult<CollectionStudySetPayload>> {
  const client = getClient()
  const totalChunks = chunks.length

  // Détecter la langue du premier chunk (représentatif du corpus entier)
  const detectedLanguage = detectLanguage(chunks[0] || '')
  console.log(`[generateCollectionStudySetWithChunking] Langue détectée: ${detectedLanguage}`)

  // Lancer tous les appels en parallèle
  const chunkPromises = chunks.map(async (chunk, chunkIndex) => {
    const { flashcardsTarget, quizTarget } = targetsPerChunk[chunkIndex]

    // System prompt spécifique pour ce chunk avec les nombres exacts et la langue détectée
    const systemPrompt = buildSystemPromptForChunk(flashcardsTarget, quizTarget, chunkIndex, totalChunks, detectedLanguage)

    // User message pour ce chunk
    const userMessage = JSON.stringify(
      {
        instructions: `Génère EXACTEMENT ${flashcardsTarget} flashcards et EXACTEMENT ${quizTarget} questions de quiz pour ce fragment (${chunkIndex + 1}/${totalChunks}).`,
        context: {
          ...(metadata ?? {}),
          chunkIndex: chunkIndex + 1,
          totalChunks,
          flashcardsTarget,
          quizTarget,
        },
        corpus: chunk,
        flashcardsTarget,
        quizTarget,
        REQUIRED_FLASHCARDS: flashcardsTarget,
        REQUIRED_QUIZ: quizTarget,
      },
      null,
      2
    )

    // Calculer max_tokens pour ce chunk
    // Limite: gpt-4o-mini supporte max 16384 completion tokens
    const estimatedTokens = flashcardsTarget * 250 + quizTarget * 400 + 2000
    const maxTokens = Math.max(8000, Math.min(estimatedTokens, 16384))

    console.log(
      `[generateCollectionStudySetWithChunking] Chunk ${chunkIndex + 1}/${totalChunks}: ${flashcardsTarget} FC + ${quizTarget} Q, max_tokens: ${maxTokens}`
    )

    // Utiliser retry avec backoff exponentiel pour les appels OpenAI
    // Phase 2: Gestion d'erreurs améliorée avec contexte
    const metadataContext = metadata as any
    let completion
    try {
      completion = await openaiWithRetry(
        () =>
          client.chat.completions.create({
            model: "gpt-4o-mini", // Utiliser gpt-4o-mini pour tous les chunks comme demandé
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userMessage },
            ],
            temperature: 0.3,
            max_tokens: maxTokens,
            response_format: { type: "json_object" },
          } as any),
        {
          maxAttempts: 3,
          initialDelayMs: 2000,
          context: {
            collectionId: metadataContext?.collectionId,
            collectionTitle: metadataContext?.collectionTitle,
            chunkIndex: chunkIndex + 1,
            totalChunks,
            mode: "collection-chunking",
          },
        }
      )
    } catch (error: any) {
      // Structurer l'erreur pour un meilleur logging et messages user-friendly
      const structuredError = structureOpenAIError(error, {
        collectionId: metadataContext?.collectionId,
        collectionTitle: metadataContext?.collectionTitle,
        chunkIndex: chunkIndex + 1,
        totalChunks,
        mode: "collection-chunking",
      })
      logStructuredError(structuredError)
      // Re-throw avec le message user-friendly
      const userFriendlyError = new Error(`Chunk ${chunkIndex + 1}/${totalChunks}: ${structuredError.userMessage}`)
      // @ts-ignore - Ajouter les propriétés pour le fallback
      userFriendlyError.structuredError = structuredError
      throw userFriendlyError
    }

    const result = completion.choices[0]?.message?.content?.trim() ?? ""
    if (!result) {
      throw new Error(`Aucune réponse de l'IA pour le chunk ${chunkIndex + 1}`)
    }

    try {
      const parsed = JSON.parse(result) as CollectionStudySetPayload
      return {
        data: parsed,
        raw: result,
        tokensUsed: completion.usage?.total_tokens ?? 0,
        promptTokens: completion.usage?.prompt_tokens ?? undefined,
        completionTokens: completion.usage?.completion_tokens ?? undefined,
        model: completion.model ?? "gpt-4o-mini",
      }
    } catch (error) {
      console.error(`[generateCollectionStudySetWithChunking] Erreur parsing JSON pour chunk ${chunkIndex + 1}`, error, result)
      throw new Error(`Réponse IA non exploitable pour le chunk ${chunkIndex + 1}`)
    }
  })

  // Attendre tous les résultats en parallèle
  const chunkResults = await Promise.all(chunkPromises)

  // Fusionner tous les résultats
  const mergedFlashcards: StudySetFlashcard[] = []
  const mergedQuiz: QuizQuestionPayload[] = []
  let totalTokensUsed = 0
  let totalPromptTokens = 0
  let totalCompletionTokens = 0

  for (const result of chunkResults) {
    mergedFlashcards.push(...(result.data.flashcards ?? []))
    mergedQuiz.push(...(result.data.quiz ?? []))
    totalTokensUsed += result.tokensUsed
    totalPromptTokens += result.promptTokens ?? 0
    totalCompletionTokens += result.completionTokens ?? 0
  }

  // Phase 2: Détection et suppression des doublons avant fusion
  const deduplicatedFlashcards = deduplicateFlashcards(mergedFlashcards)
  const deduplicatedQuiz = deduplicateQuizQuestions(mergedQuiz)

  console.log(`[generateCollectionStudySetWithChunking] Détection doublons:`, {
    flashcardsAvant: mergedFlashcards.length,
    flashcardsApres: deduplicatedFlashcards.length,
    flashcardsSupprimees: mergedFlashcards.length - deduplicatedFlashcards.length,
    quizAvant: mergedQuiz.length,
    quizApres: deduplicatedQuiz.length,
    quizSupprimees: mergedQuiz.length - deduplicatedQuiz.length,
  })

  // Limiter aux cibles totales si on dépasse (peut arriver avec les overlaps)
  const totalFlashcardsTarget = targetsPerChunk.reduce((sum, t) => sum + t.flashcardsTarget, 0)
  const totalQuizTarget = targetsPerChunk.reduce((sum, t) => sum + t.quizTarget, 0)

  const finalFlashcards = deduplicatedFlashcards.slice(0, totalFlashcardsTarget)
  const finalQuiz = deduplicatedQuiz.slice(0, totalQuizTarget)

  console.log(`[generateCollectionStudySetWithChunking] Résultats fusionnés:`, {
    flashcardsGenerees: mergedFlashcards.length,
    flashcardsFinales: finalFlashcards.length,
    flashcardsCibles: totalFlashcardsTarget,
    quizGeneres: mergedQuiz.length,
    quizFinaux: finalQuiz.length,
    quizCibles: totalQuizTarget,
    totalTokens: totalTokensUsed,
  })

  // Générer les métadonnées à partir du premier chunk ou agréger
  const firstChunkMetadata = chunkResults[0]?.data.metadata
  const aggregatedMetadata = {
    recommendedSessionLength:
      firstChunkMetadata?.recommendedSessionLength ?? Math.ceil((totalFlashcardsTarget + totalQuizTarget) * 1.5),
    summary: firstChunkMetadata?.summary ?? `Collection générée à partir de ${totalChunks} fragments.`,
    notes: firstChunkMetadata?.notes ?? [],
  }

  return {
    data: {
      flashcards: finalFlashcards,
      quiz: finalQuiz,
      metadata: aggregatedMetadata,
    },
    raw: JSON.stringify({ flashcards: finalFlashcards, quiz: finalQuiz, metadata: aggregatedMetadata }),
    tokensUsed: totalTokensUsed,
    promptTokens: totalPromptTokens,
    completionTokens: totalCompletionTokens,
    model: "gpt-4o-mini",
  }
}

/**
 * Phase 2: Détecte et supprime les flashcards en double basé sur la similarité sémantique
 * Utilise une comparaison simple basée sur la normalisation du texte
 */
function deduplicateFlashcards(flashcards: StudySetFlashcard[]): StudySetFlashcard[] {
  const seen = new Set<string>()
  const deduplicated: StudySetFlashcard[] = []

  for (const card of flashcards) {
    // Normaliser la question pour la comparaison (minuscules, supprimer espaces/ponctuation)
    const normalizedQuestion = card.question
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .replace(/\s+/g, " ")
      .trim()

    // Créer une clé unique basée sur la question normalisée
    const key = normalizedQuestion

    if (!seen.has(key)) {
      seen.add(key)
      deduplicated.push(card)
    } else {
      console.log(`[deduplicateFlashcards] Doublon détecté et supprimé: "${card.question.substring(0, 50)}..."`)
    }
  }

  return deduplicated
}

/**
 * Phase 2: Détecte et supprime les questions de quiz en double basé sur la similarité sémantique
 */
function deduplicateQuizQuestions(questions: QuizQuestionPayload[]): QuizQuestionPayload[] {
  const seen = new Set<string>()
  const deduplicated: QuizQuestionPayload[] = []

  for (const question of questions) {
    // Normaliser le prompt pour la comparaison
    const normalizedPrompt = question.prompt
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .replace(/\s+/g, " ")
      .trim()

    // Créer une clé unique basée sur le prompt normalisé
    const key = normalizedPrompt

    if (!seen.has(key)) {
      seen.add(key)
      deduplicated.push(question)
    } else {
      console.log(`[deduplicateQuizQuestions] Doublon détecté et supprimé: "${question.prompt.substring(0, 50)}..."`)
    }
  }

  return deduplicated
}

/**
 * Prépare une stratégie de chunking pour diviser un corpus en fragments plus petits
 */
function prepareChunkingStrategy(
  corpus: string,
  flashcardsTarget: number,
  quizTarget: number
): {
  chunks: string[]
  targetsPerChunk: Array<{ flashcardsTarget: number; quizTarget: number }>
} {
  const CHUNK_SIZE = 40_000 // Augmenté pour réduire le nombre de chunks
  const OVERLAP_SIZE = 2_000 // Augmenté pour meilleur contexte

  // Si le corpus est petit, pas besoin de chunking
  if (corpus.length <= CHUNK_SIZE) {
    return {
      chunks: [corpus],
      targetsPerChunk: [{ flashcardsTarget, quizTarget }],
    }
  }

  const chunks: string[] = []
  const targetsPerChunk: Array<{ flashcardsTarget: number; quizTarget: number }> = []

  let startIndex = 0
  const totalLength = corpus.length

  while (startIndex < totalLength) {
    const endIndex = Math.min(startIndex + CHUNK_SIZE, totalLength)
    let chunk = corpus.slice(startIndex, endIndex)

    // Ajouter l'overlap depuis le chunk précédent si ce n'est pas le premier
    if (startIndex > 0 && startIndex + OVERLAP_SIZE <= totalLength) {
      const overlapStart = Math.max(0, startIndex - OVERLAP_SIZE)
      const overlapText = corpus.slice(overlapStart, startIndex)
      chunk = overlapText + "\n\n[... suite ...]\n\n" + chunk
    }

    // Ajouter l'overlap vers le chunk suivant si ce n'est pas le dernier
    if (endIndex < totalLength) {
      const nextOverlapEnd = Math.min(endIndex + OVERLAP_SIZE, totalLength)
      const nextOverlapText = corpus.slice(endIndex, nextOverlapEnd)
      chunk = chunk + "\n\n[... suite ...]\n\n" + nextOverlapText
    }

    chunks.push(chunk)

    // Calculer les cibles pour ce chunk (proportionnel à sa taille)
    const chunkSize = endIndex - startIndex
    const chunkRatio = chunkSize / totalLength
    const chunkFlashcardsTarget = Math.max(1, Math.floor(flashcardsTarget * chunkRatio))
    const chunkQuizTarget = Math.max(1, Math.floor(quizTarget * chunkRatio))

    targetsPerChunk.push({
      flashcardsTarget: chunkFlashcardsTarget,
      quizTarget: chunkQuizTarget,
    })

    // Avancer en soustrayant l'overlap pour éviter la duplication
    startIndex = endIndex - OVERLAP_SIZE
  }

  // Ajuster les cibles pour que la somme corresponde exactement aux cibles totales
  const totalFlashcardsAssigned = targetsPerChunk.reduce((sum, t) => sum + t.flashcardsTarget, 0)
  const totalQuizAssigned = targetsPerChunk.reduce((sum, t) => sum + t.quizTarget, 0)

  if (totalFlashcardsAssigned !== flashcardsTarget) {
    const diff = flashcardsTarget - totalFlashcardsAssigned
    // Distribuer la différence sur les chunks (priorité aux plus grands)
    const sortedIndices = targetsPerChunk
      .map((_, i) => i)
      .sort((a, b) => targetsPerChunk[b].flashcardsTarget - targetsPerChunk[a].flashcardsTarget)

    for (let i = 0; i < Math.abs(diff); i++) {
      const idx = sortedIndices[i % sortedIndices.length]
      if (diff > 0) {
        targetsPerChunk[idx].flashcardsTarget++
      } else {
        targetsPerChunk[idx].flashcardsTarget = Math.max(1, targetsPerChunk[idx].flashcardsTarget - 1)
      }
    }
  }

  if (totalQuizAssigned !== quizTarget) {
    const diff = quizTarget - totalQuizAssigned
    const sortedIndices = targetsPerChunk
      .map((_, i) => i)
      .sort((a, b) => targetsPerChunk[b].quizTarget - targetsPerChunk[a].quizTarget)

    for (let i = 0; i < Math.abs(diff); i++) {
      const idx = sortedIndices[i % sortedIndices.length]
      if (diff > 0) {
        targetsPerChunk[idx].quizTarget++
      } else {
        targetsPerChunk[idx].quizTarget = Math.max(1, targetsPerChunk[idx].quizTarget - 1)
      }
    }
  }

  console.log(`[prepareChunkingStrategy] Corpus divisé en ${chunks.length} chunks:`, {
    totalChars: corpus.length,
    chunks: chunks.map((c, i) => ({
      index: i,
      size: c.length,
      flashcardsTarget: targetsPerChunk[i].flashcardsTarget,
      quizTarget: targetsPerChunk[i].quizTarget,
    })),
  })

  return { chunks, targetsPerChunk }
}

export async function generateCollectionStudySet(params: { text: string; metadata?: GenerationMetadata }) {
  const flashcardsTarget = (params.metadata as any)?.flashcardsTarget ?? 16
  const quizTarget = (params.metadata as any)?.quizTarget ?? 9

  // Décider si on utilise le chunking (si le corpus est grand ou si beaucoup d'éléments demandés)
  // Seuil abaissé pour forcer le chunking plus tôt
  const shouldUseChunking = params.text.length > 20_000 || flashcardsTarget > 20 || quizTarget > 10

  if (shouldUseChunking) {
    console.log(`[generateCollectionStudySet] Utilisation du chunking: corpus=${params.text.length} chars, ${flashcardsTarget} FC + ${quizTarget} Q`)
    const { chunks, targetsPerChunk } = prepareChunkingStrategy(params.text, flashcardsTarget, quizTarget)
    return generateCollectionStudySetWithChunking(chunks, targetsPerChunk, params.metadata)
  } else {
    // Pour les petits corpus, utiliser l'ancienne méthode
    const mode = (params.metadata as any)?.mode === "subject" ? "subject" : "collection"
    return runStructuredMode<CollectionStudySetPayload>(mode, params.text, params.metadata)
  }
}
