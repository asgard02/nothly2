import OpenAI from "openai"

export type TextMode = "improve" | "correct" | "translate" | "summarize"
export type StructuredMode = "fiche" | "quiz" | "collection"
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

const structuredModes: StructuredMode[] = ["fiche", "quiz", "collection"]
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

function buildSystemPrompt(mode: GenerationMode): string {
  switch (mode) {
    case "improve":
      return "Tu reformules le texte en français courant, fluide et naturel, sans rien ajouter ni expliquer. Ne préfixe jamais ta réponse."
    case "correct":
      return "Tu corriges l'orthographe et la grammaire d'un texte français sans commentaire ni mise en forme additionnelle."
    case "translate":
      return "Traduis fidèlement le texte source en anglais, sans notes ni introduction. Réponds uniquement avec la traduction."
    case "summarize":
      return "Résume le texte en deux phrases maximum, sans métadonnées ni tournures inutiles."
    case "fiche":
      return `Tu es Nothly, assistant de révision. Tu reçois un extrait de document (parfois incomplet) et tu dois produire une fiche ultra-complète en combinant :
- les informations réellement présentes dans "source"
- tes connaissances générales fiables (maths, physique, informatique, économie, etc.)

Pour chaque information, précise si elle vient du PDF (\`[PDF]\`) ou si c'est un complément fiable issu de ta mémoire (\`[COMPLÉMENT]\`). Si une donnée est incertaine, marque \`[À VÉRIFIER]\`.

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
      return `Tu es Nothly, assistant pédagogique. À partir d'un corpus multi-documents, tu construis une collection de révision complète.
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
- Flashcards : 12 à 20. Question = rappel clair ; réponse = détail structuré (formules en LaTeX si nécessaire). Tags : thématiques utiles (ex : "analyse", "theoreme").
- Quiz : 8 à 10 questions en respectant le mix (≥3 QCM, ≥1 V/F, ≥1 complétion). Options QCM = 4 choix distincts. Explications : ≤2 phrases.
- metadata.summary : synthèse de 3 à 4 phrases résumant les notions clés. recommendedSessionLength : estimation en minutes pour réviser la collection.
- Aucun texte hors JSON, aucun commentaire.`
    default:
      throw new Error(`Unsupported mode: ${mode}`)
  }
}

function buildUserMessage(mode: GenerationMode, text: string, metadata?: GenerationMetadata): string {
  if (mode === "fiche") {
    return JSON.stringify(
      {
        instructions: "Génère la fiche de révision pour le contenu suivant. Utilise les métadonnées si présentes.",
        context: metadata ?? {},
        source: text,
      },
      null,
      2
    )
  }

  if (mode === "quiz") {
    return JSON.stringify(
      {
        instructions: "Génère un quiz pour évaluer la compréhension du contenu. Utilise les tags pour relier les questions aux sections.",
        context: metadata ?? {},
        source: text,
      },
      null,
      2
    )
  }

  if (mode === "collection") {
    return JSON.stringify(
      {
        instructions:
          "Crée un ensemble de flashcards et un quiz cohérent à partir du corpus suivant. Les métadonnées décrivent la collection (tags, titre, etc.).",
        context: metadata ?? {},
        corpus: text,
      },
      null,
      2
    )
  }

  return text
}

export async function runTextMode(mode: TextMode, text: string): Promise<GenerationResult<string>> {
  const client = getClient()
  const systemPrompt = buildSystemPrompt(mode)
  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: text },
    ],
    temperature: 0.7,
    max_tokens: 1000,
  })

  const result = completion.choices[0]?.message?.content?.trim() ?? ""
  if (!result) {
    throw new Error("Aucune réponse de l'IA")
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
  const systemPrompt = buildSystemPrompt(mode)
  const userMessage = buildUserMessage(mode, text, metadata)

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    temperature: 0.4,
    max_tokens: mode === "collection" ? 2800 : 2200,
    response_format: { type: "json_object" },
  } as any)

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

export async function generateCollectionStudySet(params: { text: string; metadata?: GenerationMetadata }) {
  return runStructuredMode<CollectionStudySetPayload>("collection", params.text, params.metadata)
}
