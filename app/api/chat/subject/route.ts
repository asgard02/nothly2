import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"
import { getSupabaseAdmin } from "@/lib/db"
import { withRateLimit } from "@/lib/rate-limit"

export const dynamic = "force-dynamic"

// POST /api/chat/subject - Chat avec contexte de matière et documents mentionnés
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    if (!supabase) {
      return NextResponse.json({ error: "Configuration Supabase manquante" }, { status: 500 })
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    // Rate limiting pour les endpoints IA (coûteux)
    const rateLimitResponse = await withRateLimit(request, "ai", user.id)
    if (rateLimitResponse) return rateLimitResponse

    const admin = getSupabaseAdmin()
    if (!admin) {
      return NextResponse.json({ error: "Configuration Supabase manquante" }, { status: 500 })
    }

    const body = await request.json()
    const { subjectId, message, mentionedDocumentIds, sectionIds } = body
    
    // Support backward compatibility if client sends collectionId
    const targetId = subjectId || body.collectionId

    if (!targetId || !message) {
      return NextResponse.json({ error: "subjectId et message sont requis" }, { status: 400 })
    }

    // Vérifier que la matière appartient à l'utilisateur
    const { data: collection, error: collectionError } = await admin
      .from("collections")
      .select("id, title")
      .eq("id", targetId)
      .eq("user_id", user.id)
      .single()

    if (collectionError || !collection) {
      return NextResponse.json({ error: "Matière non trouvée" }, { status: 404 })
    }

    // Récupérer les documents de la matière (tous ou seulement ceux mentionnés)
    let documentIds: string[] = []
    
    if (mentionedDocumentIds && mentionedDocumentIds.length > 0) {
      // Seulement les documents mentionnés
      documentIds = mentionedDocumentIds
    } else {
      // Tous les documents de la matière
      const { data: allDocs } = await admin
        .from("documents")
        .select("id")
        .eq("collection_id", targetId)
        .eq("user_id", user.id)
      
      documentIds = allDocs?.map((d: any) => d.id) || []
    }

    // Vérifier si la matière contient des documents
    if (documentIds.length === 0) {
      return NextResponse.json({ 
        error: "No documents in this subject.",
        response: "Please add PDF documents to this subject before asking questions or creating flashcards/quizzes."
      }, { status: 400 })
    }

    // Détecter intelligemment l'intention SEULEMENT si ce n'est pas un mode conversation explicit
    let isFlashcardRequest = false
    let isQuizRequest = false
    let isSummaryRequest = false
    let searchTopic: string | null = null

    // Si le mode est explicitement "conversation", on force le mode question/discussion
    // par contre si c'est "auto", on laisse l'IA décider
    if (body.mode !== "conversation") {
        try {
        const intentResponse = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
                {
                role: "system",
                content: `Analyze the user's message. Respond ONLY with a JSON: {"intent": "flashcard"|"quiz"|"summary"|"question", "topic": "extracted topic or null"}.
    Rules:
    - "flashcard" ONLY if explicitly asked (create cards, flashcards, study deck)
    - "quiz" ONLY if explicitly asked (create quiz, test me)
    - "summary" ONLY if explicitly asked (summarize this, tldr)
    - "question" for EVERYTHING else (chat, discussion, specific questions, explaining concepts).`
                },
                { role: "user", content: message },
            ],
            max_tokens: 100,
            temperature: 0.3,
            }),
        })

        if (intentResponse.ok) {
            const intentData = await intentResponse.json()
            const responseText = intentData.choices?.[0]?.message?.content?.trim()
            
            try {
            const jsonMatch = responseText.match(/\{[\s\S]*\}/)
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0])
                isFlashcardRequest = parsed.intent === "flashcard"
                isQuizRequest = parsed.intent === "quiz"
                isSummaryRequest = parsed.intent === "summary"
                searchTopic = parsed.topic || null
            }
            } catch (parseError) {
            console.warn("[POST /api/chat/subject] Error parsing intent:", parseError)
            }
        }
        } catch (error) {
        console.warn("[POST /api/chat/subject] Error detecting AI intent:", error)
        }
    }

    // Fallback: détection par mots-clés si l'IA n'a pas fonctionné ET que le mode n'est pas "conversation"
    if (body.mode !== "conversation" && !isFlashcardRequest && !isQuizRequest && !isSummaryRequest) {
      const flashcardKeywords = ["flashcard", "carte", "cartes", "révision", "mémorisation", "apprendre", "étudier", "réviser", "mémoriser", "card", "cards", "study", "memorize", "review"]
      const quizKeywords = ["quiz", "question", "questions", "test", "examen", "évaluation", "interro", "qcm", "teste", "tester", "exam", "evaluation"]
      const summaryKeywords = ["résumé", "résumer", "synthèse", "synthétiser", "récapitulatif", "récapituler", "resumer", "synthese", "summary", "summarize", "synthesis", "recap", "liste", "lister", "list"]
      
      isFlashcardRequest = flashcardKeywords.some(keyword => message.toLowerCase().includes(keyword))
      isQuizRequest = quizKeywords.some(keyword => message.toLowerCase().includes(keyword))
      isSummaryRequest = summaryKeywords.some(keyword => message.toLowerCase().includes(keyword))
    }

    // Récupérer le contenu des documents pour le contexte
    // Si c'est une demande de flashcards/quiz/résumé, on cherche les sections pertinentes
    const documentContents: Array<{ id: string; title: string; content: string; sections?: Array<{ content: string; order_index: number }> }> = []
    
    console.log(`[POST /api/chat/subject] 🔍 Processing ${documentIds.length} document(s) for subject ${targetId}`)
    console.log(`[POST /api/chat/subject] 📋 Document IDs:`, documentIds)
    
    const skippedDocs: Array<{ id: string; title: string; reason: string }> = []
    
    for (const docId of documentIds) {
      // Récupérer le document (sans embarquer document_versions pour éviter l'ambiguïté)
      const { data: doc, error: docError } = await admin
        .from("documents")
        .select("id, title, current_version_id")
        .eq("id", docId)
        .eq("user_id", user.id)
        .single()

      if (docError || !doc) {
        console.warn(`[POST /api/chat/subject] Document ${docId} not found:`, docError)
        skippedDocs.push({ id: docId, title: "Unknown", reason: "Document not found" })
        continue
      }

      // Utiliser current_version_id si disponible, sinon récupérer la dernière version
      let versionId: string | null = null
      if (doc.current_version_id) {
        versionId = doc.current_version_id
      } else {
        // Récupérer la dernière version manuellement
        const { data: versions } = await admin
          .from("document_versions")
          .select("id")
          .eq("document_id", docId)
          .order("created_at", { ascending: false })
          .limit(1)
        
        if (versions && versions.length > 0) {
          versionId = versions[0].id
        }
      }

      if (!versionId) {
        console.warn(`[POST /api/chat/subject] No version found for document ${docId} (title: ${doc.title})`)
        skippedDocs.push({ id: docId, title: doc.title, reason: "No version found" })
        continue
      }
      
      console.log(`[POST /api/chat/subject] Document ${docId} (${doc.title}) - Version ID: ${versionId}`)
      
      // Récupérer le raw_text de la version d'abord (plus fiable que les sections)
      const { data: version, error: versionError } = await admin
        .from("document_versions")
        .select("raw_text")
        .eq("id", versionId)
        .single()

      if (versionError) {
        console.warn(`[POST /api/chat/subject] Error fetching version for ${docId}:`, versionError)
        skippedDocs.push({ id: docId, title: doc.title, reason: `Error fetching version: ${versionError.message}` })
        continue
      }

      // Log pour debug
      if (version) {
        const rawTextLength = version.raw_text ? version.raw_text.length : 0
        const hasRawText = version.raw_text && version.raw_text.trim().length > 0
        console.log(`[POST /api/chat/subject] Document ${docId} - raw_text: ${rawTextLength} chars, hasContent: ${hasRawText}`)
      } else {
        console.warn(`[POST /api/chat/subject] Document ${docId} - Version ${versionId} not found`)
        continue
      }

      // Récupérer les sections du document avec leur index (optionnel)
      const { data: sections, error: sectionsError } = await admin
        .from("document_sections")
        .select("id, content, order_index")
        .eq("document_version_id", versionId)
        .order("order_index", { ascending: true })

      if (sectionsError) {
        console.warn(`[POST /api/chat/subject] Error fetching sections for ${docId}:`, sectionsError)
        // Ne pas continuer, on peut utiliser raw_text à la place
      }

      // Déterminer le contenu à utiliser : sections si disponibles, sinon raw_text
      let relevantContent: string = ""
      let relevantSections: Array<{ content: string; order_index: number }> = []

      if (sections && sections.length > 0) {
        // Utiliser les sections si disponibles
        console.log(`[POST /api/chat/subject] Document ${docId} (${doc.title}) - ${sections.length} sections found`)
        
        let filteredSections = sections

        if (sectionIds && sectionIds.length > 0) {
          // PRIORITY 1: Explicit Section IDs (Heatmap selection)
          filteredSections = sections.filter((s: any) => sectionIds.includes(s.id))
          console.log(`[POST /api/chat/subject] Document ${docId} - Filtered by sectionIds: ${filteredSections.length} sections kept`)
        } else if ((isFlashcardRequest || isQuizRequest) && searchTopic) {
          // PRIORITY 2: Topic-based filtering (Legacy/Auto)
          // Rechercher les sections pertinentes au sujet
          const topicWords = searchTopic.toLowerCase().split(/\s+/)
          
          filteredSections = sections.filter((s: any) => {
            const contentLower = s.content.toLowerCase()
            return topicWords.some(word => contentLower.includes(word))
          })
        }

        if (filteredSections.length > 0) {
          // Utiliser seulement les sections pertinentes
          relevantSections = filteredSections.map((s: any) => ({
            content: s.content,
            order_index: s.order_index
          }))
          relevantContent = filteredSections.map((s: any) => s.content).join("\n\n")
        } else {
          // Si aucune section ne correspond (ou filtrage vide), utiliser toutes les sections
          // SAUF si on avait des sectionIds explicites (dans ce cas, on respecte la sélection vide pour ce doc)
          if (sectionIds && sectionIds.length > 0) {
             relevantSections = []
             relevantContent = ""
          } else {
            relevantSections = sections.map((s: any) => ({
              content: s.content,
              order_index: s.order_index
            }))
            relevantContent = sections.map((s: any) => s.content).join("\n\n")
          }
        }
      } else if (version && version.raw_text && version.raw_text.trim().length > 0) {
        // Utiliser raw_text comme fallback si pas de sections
        console.log(`[POST /api/chat/subject] Document ${docId} (${doc.title}) - Using raw_text (${version.raw_text.length} chars)`)
        relevantContent = version.raw_text.trim()
        relevantSections = []
      } else {
        // Aucun contenu disponible - log détaillé pour debug
        const rawTextStatus = version?.raw_text 
          ? (version.raw_text.trim().length > 0 ? `raw_text exists but empty (${version.raw_text.length} chars)` : `raw_text null/undefined`)
          : "version not found"
        console.warn(`[POST /api/chat/subject] No content available for document ${docId} (${doc.title}, version ${versionId}) - ${rawTextStatus}`)
        skippedDocs.push({ 
          id: docId, 
          title: doc.title, 
          reason: version?.raw_text ? `raw_text empty (${version.raw_text.length} chars)` : "raw_text missing" 
        })
        continue
      }

      if (!relevantContent || relevantContent.trim().length === 0) {
        console.warn(`[POST /api/chat/subject] Empty content for document ${docId}`)
        skippedDocs.push({ id: docId, title: doc.title, reason: "Empty content after processing" })
        continue
      }

      documentContents.push({
        id: doc.id,
        title: doc.title,
        content: relevantContent.substring(0, 100000), // Limite augmentée pour éviter de tronquer le contenu
        sections: relevantSections,
      })
    }

    // Log pour debug
    console.log(`[POST /api/chat/subject] Retrieved documents: ${documentContents.length}, Total content: ${documentContents.reduce((sum, d) => sum + d.content.length, 0)} chars`)
    if (skippedDocs.length > 0) {
      console.warn(`[POST /api/chat/subject] Skipped documents (${skippedDocs.length}):`, skippedDocs.map(d => `${d.title} (${d.reason})`).join(", "))
    }

    // Construire le contexte pour l'IA
    const contextParts: string[] = []
    contextParts.push(`Matière: ${collection.title}`)
    
    if (documentContents.length > 0) {
      contextParts.push("\nAvailable documents:")
      documentContents.forEach((doc) => {
        contextParts.push(`\n--- Document: ${doc.title} (ID: ${doc.id}) ---`)
        contextParts.push(doc.content)
      })
    } else {
      // Si aucun contenu n'a été trouvé, vérifier si les documents sont en cours de traitement
      const { data: docsStatus } = await admin
        .from("documents")
        .select("id, title, status")
        .eq("collection_id", targetId)
        .eq("user_id", user.id)
      
      const processingDocs = docsStatus?.filter((d: any) => d.status === "processing") || []
      const readyDocs = docsStatus?.filter((d: any) => d.status === "ready") || []
      
      if (processingDocs.length > 0) {
        // Des documents sont en cours de traitement
        return NextResponse.json({ 
          error: "Documents are being processed. Please wait a few moments and try again.",
          response: `The following documents are being processed: ${processingDocs.map((d: any) => d.title).join(", ")}. Please wait until they are ready before creating flashcards or quizzes.`
        }, { status: 400 })
      } else if (readyDocs.length === 0) {
        // Aucun document dans la collection
        return NextResponse.json({ 
          error: "No documents in this subject.",
          response: "Please add PDF documents to this subject first."
        }, { status: 400 })
      } else {
        // Documents prêts mais pas de contenu extrait
        console.warn(`[POST /api/chat/subject] No content found for subject ${targetId} despite ${readyDocs.length} ready document(s)`)
        
        // Construire un message d'erreur détaillé avec les documents problématiques
        const docTitles = readyDocs.map((d: any) => d.title).join(", ")
        let errorDetails = `The following documents have no extracted text content:\n${docTitles}\n\n`
        
        // Vérifier les versions des documents pour diagnostiquer le problème
        const docIds = readyDocs.map((d: any) => d.id)
        const { data: versions } = await admin
          .from("document_versions")
          .select("id, document_id, raw_text")
          .in("document_id", docIds)
        
        // Vérifier aussi les sections
        const versionIds = versions?.map((v: any) => v.id) || []
        const { data: sectionsCount } = await admin
          .from("document_sections")
          .select("document_version_id")
          .in("document_version_id", versionIds)
        
        const sectionsByVersion = new Map<string, number>()
        sectionsCount?.forEach((s: any) => {
          const count = sectionsByVersion.get(s.document_version_id) || 0
          sectionsByVersion.set(s.document_version_id, count + 1)
        })
        
        const docsWithoutContent = readyDocs.filter((doc: any) => {
          const version = versions?.find((v: any) => v.document_id === doc.id)
          if (!version) return true
          const hasRawText = version.raw_text && version.raw_text.trim().length > 0
          const hasSections = (sectionsByVersion.get(version.id) || 0) > 0
          return !hasRawText && !hasSections
        })
        
        if (docsWithoutContent.length > 0) {
          const problematicTitles = docsWithoutContent.map((d: any) => d.title).join(", ")
          console.warn(`[POST /api/chat/subject] Documents without content: ${problematicTitles}`)
          errorDetails = `The following documents have no text content:\n${problematicTitles}\n\n`
        }
        
        // Construire un message d'erreur détaillé avec instructions
        const errorMessage = `${errorDetails}Possible causes:\n- Documents were uploaded before text extraction was enabled\n- PDFs are scanned images (no extractable text)\n- Text extraction failed during upload\n\nSolutions:\n1. Run the re-extraction script:\n   npx tsx scripts/re-extract-pdf-text.ts\n\n2. Check server logs to see which documents are ignored\n\n3. If the script doesn't work, re-upload the documents`
        
        console.error(`[POST /api/chat/subject] ❌ No content found - ${readyDocs.length} ready document(s) but no text content`)
        console.error(`[POST /api/chat/subject] Documents without content:`, docsWithoutContent.map((d: any) => d.title))
        
        return NextResponse.json({ 
          error: "No text content could be extracted from the documents.",
          response: errorMessage
        }, { status: 400 })
      }
    }

    const context = contextParts.join("\n")
    
    // Log pour debug
    console.log(`[POST /api/chat/subject] Context built: ${context.length} chars, ${documentContents.length} documents`)

    // Appeler l'API OpenAI avec le contexte
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ 
        error: "OpenAI configuration missing",
        response: "I cannot answer because the OpenAI API is not configured. Here is the context I would have used:\n\n" + context.substring(0, 500) + "..."
      }, { status: 500 })
    }

    // Adapter le prompt système selon le type de demande
    let systemPrompt: string
    if (isFlashcardRequest) {
      systemPrompt = `Tu es un assistant IA spécialisé dans la création de flashcards éducatives à partir de documents PDF.

⚠️ IMPORTANT : Tu DOIS utiliser UNIQUEMENT le contenu fourni dans les documents ci-dessous. N'invente RIEN qui ne soit pas dans ces documents.

L'utilisateur veut créer des flashcards sur le sujet: "${searchTopic || 'le contenu des documents'}".

Tu as accès au contenu EXACT des documents suivants. Crée des flashcards de qualité en format JSON avec cette structure:
[
  {
    "question": "Question claire et précise basée sur le contenu",
    "answer": "Réponse détaillée et complète tirée du contenu"
  }
]

RÈGLES STRICTES:
- Utilise UNIQUEMENT le contenu fourni dans les documents ci-dessous
- Ne crée PAS de flashcards sur des sujets qui ne sont PAS dans les documents
- Si le sujet demandé n'est pas dans les documents, utilise le contenu disponible
- Les questions et réponses doivent être basées sur le contenu réel des documents
- Génère entre 5 et 15 flashcards selon la quantité de contenu disponible

Contexte des documents (UTILISE UNIQUEMENT CE CONTENU):
${context.substring(0, 100000)}`
    } else if (isQuizRequest) {
      systemPrompt = `Tu es un assistant IA spécialisé dans la création de quiz éducatifs à partir de documents PDF.

⚠️ IMPORTANT : Tu DOIS utiliser UNIQUEMENT le contenu fourni dans les documents ci-dessous. N'invente RIEN qui ne soit pas dans ces documents.

L'utilisateur veut créer un quiz sur le sujet: "${searchTopic || 'le contenu des documents'}".

Tu as accès au contenu EXACT des documents suivants. Crée un quiz de qualité en format JSON avec cette structure:
[
  {
    "question_type": "multiple_choice",
    "prompt": "Question claire basée sur le contenu",
    "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
    "answer": "Option 1",
    "explanation": "Explication de la réponse tirée du contenu"
  }
]

RÈGLES STRICTES:
- Utilise UNIQUEMENT le contenu fourni dans les documents ci-dessous
- Ne crée PAS de questions sur des sujets qui ne sont PAS dans les documents
- Si le sujet demandé n'est pas dans les documents, utilise le contenu disponible
- Les questions et réponses doivent être basées sur le contenu réel des documents
- Les types de questions possibles sont: "multiple_choice", "true_false", "completion"
- Génère entre 5 et 15 questions selon la quantité de contenu disponible

Contexte des documents (UTILISE UNIQUEMENT CE CONTENU):
${context.substring(0, 100000)}`
    } else if (isSummaryRequest) {
      systemPrompt = `Tu es un assistant IA expert en analyse de documents.
      
⚠️ IMPORTANT : Tu DOIS utiliser UNIQUEMENT le contenu fourni dans les documents ci-dessous.

L'utilisateur veut un résumé ou une extraction sur le sujet: "${searchTopic || 'le contenu global'}".

RÈGLES CRITIQUES :
1. Si l'utilisateur demande une LISTE (abréviations, dates, définitions, vocabulaire, etc.) :
   - TU DOIS ÊTRE EXHAUSTIF. Ne fais AUCUNE sélection.
   - Recopie TOUS les éléments trouvés dans le document, un par un.
   - Ne résume pas, ne synthétise pas. Agis comme un extracteur de données.
   - Si la liste est longue (ex: 50 items), donne les 50 items.

2. Sinon (pour un résumé classique) :
   - Rédige un résumé structuré, clair et complet.
   - Mets en avant les points clés.

Contexte des documents (UTILISE UNIQUEMENT CE CONTENU):
${context.substring(0, 100000)}`
    } else {
      systemPrompt = `Tu es un assistant pédagogique virtuel intelligent et amical. Tu discutes avec l'étudiant concernant sa matière "${collection.title}".
            
Ton objectif est de répondre à ses questions, d'expliquer des concepts, et de l'aider à comprendre ses cours, en te basant sur les documents fournis.

CONTEXTE (Documents disponibles) :
${context.substring(0, 100000)}

RÈGLES DE CONVERSATION :
1. Réponds de manière naturelle, comme un tuteur ou un professeur particulier.
2. Utilise le contexte ci-dessus pour tes réponses. Si la réponse n'est pas dans le cours, dis-le honnêtement ou utilise tes connaissances générales en précisant que ce n'est pas dans les documents.
3. Sois concis, clair et pédagogique.
4. N'hésite pas à poser des questions en retour pour vérifier la compréhension si pertinent.
5. NE GÉNÈRE PAS de JSON, de flashcards ou de quiz structurés ici. Fais juste de la conversation textuelle (Markdown accepté).`
    }

    // STRATÉGIE D'EXTRACTION EXHAUSTIVE (Deep Extraction)
    // Si c'est une demande de liste/résumé, on ne peut pas se fier à un seul appel avec tout le contexte
    // car le modèle va "résumer" au lieu de "lister".
    // On doit itérer sur les sections et extraire morceau par morceau.
    
    let aiResponse = ""
    
    if (isSummaryRequest && (message.toLowerCase().includes("list") || message.toLowerCase().includes("abréviation") || message.toLowerCase().includes("acronyme") || message.toLowerCase().includes("définition") || message.toLowerCase().includes("date"))) {
      console.log("[POST /api/chat/subject] 🚀 Mode Extraction Exhaustive activé")
      
      // 1. Récupérer TOUTES les sections (pas de filtrage par topic pour l'extraction)
      const allSections: string[] = []
      documentContents.forEach(doc => {
        if (doc.sections && doc.sections.length > 0) {
          doc.sections.forEach(s => allSections.push(s.content))
        } else {
          // Fallback si pas de sections (raw text), on découpe grossièrement
          const chunks = doc.content.match(/[\s\S]{1,15000}/g) || []
          chunks.forEach(c => allSections.push(c))
        }
      })

      console.log(`[POST /api/chat/subject] 📦 Extraction sur ${allSections.length} chunks`)

      // 2. Traiter chaque chunk (ou groupe de chunks)
      // On groupe par paquets de 20k caractères pour optimiser les appels
      const batchedChunks: string[] = []
      let currentBatch = ""
      
      for (const section of allSections) {
        if (currentBatch.length + section.length > 20000) {
          batchedChunks.push(currentBatch)
          currentBatch = ""
        }
        currentBatch += section + "\n\n"
      }
      if (currentBatch) batchedChunks.push(currentBatch)

      console.log(`[POST /api/chat/subject] 🔄 Traitement de ${batchedChunks.length} batches`)

      const extractionPromises = batchedChunks.map(async (chunk, index) => {
        try {
          const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              messages: [
                {
                  role: "system",
                  content: `You are a text processing engine.
TASK: Extract specfic data lists from the text.
RULES:
1. EXHAUSTIVENESS IS MANDATORY. If 50 items exist, extract 50.
2. NO SUMMARIZATION.
3. OUTPUT ONLY valid JSON.
4. EXCLUSION: Do NOT list single letters (a, b, c...) unless they are explicitly defined as acronyms.
5. STRICT SOURCE ADHERENCE: Only extract items ACTUALLY PRESENT in the source text. Do NOT invent, do NOT guess, do NOT use external knowledge.

OUTPUT FORMAT:
{
  "found": boolean,
  "count": number,
  "items": string[]
}`
                },
                {
                  role: "user",
                  content: `REQUEST: ${message}
                  
SOURCE TEXT:
${chunk}`
                }
              ],
              temperature: 0,
              response_format: { type: "json_object" }
            })
          })
          
          if (!response.ok) return ""
          const data = await response.json()
          const content = data.choices?.[0]?.message?.content || ""
          
          try {
            const parsed = JSON.parse(content)
            if (parsed.found && parsed.items && parsed.items.length > 0) {
                // PROGRAMMATIC FILTERING (Safety Net)
                // Filter out single letters (a, b, c...) unless they look like definitions or acronyms
                const cleanedItems = parsed.items.filter((item: string) => {
                    const cleanItem = item.trim()
                    
                    // Always exclude single lowercase letters without context: "a", "b", "c"
                    if (/^[a-z]\.?$/.test(cleanItem)) return false
                    
                    // Exclude sequence markers: "a)", "A)", "1)"
                    if (/^[a-zA-Z0-9]\)$/.test(cleanItem)) return false
                    
                    // Keep everything else (including "N.", "S.", "U.N.", "USA")
                    return true
                })
                
                return cleanedItems.join("\n")
            }
            return ""
          } catch (e) {
            return ""
          }
        } catch (e) {
          console.error(`Erreur extraction batch ${index}`, e)
          return ""
        }
      })

      const results = await Promise.all(extractionPromises)
      
      // 3. Agréger et nettoyer
      const rawList = results.filter(r => r.trim().length > 0).join("\n")
      
      // 4. Appel final pour formater/dédoublonner
      const finalResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `Tu es un assistant de mise en forme de données.
Voici des données brutes extraites d'un document. Ta mission est de les formater proprement.

RÈGLES ABSOLUES :
1. NE JAMAIS RÉSUMER. NE JAMAIS TRONQUER LA LISTE.
2. Si l'entrée contient 42 éléments, la sortie DOIT contenir 42 éléments.
3. Si les éléments sont numérotés, garde la numérotation.
4. Supprime uniquement les doublons EXACTS (même texte).
5. Formate en Markdown propre (liste à puces ou numérotée).
6. Ne pas ajouter de texte de remplissage comme "Voici la liste...". Donne juste la liste.

RAPPEL : L'EXHAUSTIVITÉ EST LA PRIORITÉ NUMÉRO 1.`
            },
            {
              role: "user",
              content: `Demande originale : ${message}\n\nDonnées brutes extraites :\n${rawList.substring(0, 100000)}` // Safety limit
            }
          ]
        })
      })

      const finalData = await finalResponse.json()
      aiResponse = finalData.choices?.[0]?.message?.content || "Erreur lors de la finalisation de la liste."

    } else {
      // MODE STANDARD (Flashcards, Quiz, Résumé simple, Question)
      const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: systemPrompt
            },
            {
              role: "user",
              content: message,
            },
          ],
          max_tokens: isFlashcardRequest || isQuizRequest || isSummaryRequest ? 4000 : 2000,
          temperature: isFlashcardRequest || isQuizRequest ? 0.5 : 0.7,
        }),
      })

      if (!openaiResponse.ok) {
        const errorData = await openaiResponse.json().catch(() => ({}))
        console.error("[POST /api/chat/subject] ❌ Erreur OpenAI:", errorData)
        return NextResponse.json({ error: "Erreur lors de l'appel à l'IA" }, { status: 500 })
      }

      const aiData = await openaiResponse.json()
      aiResponse = aiData.choices?.[0]?.message?.content || "Désolé, je n'ai pas pu générer de réponse."
    }

    // Si c'est une demande de flashcards ou quiz, essayer d'extraire le JSON et créer une study_collection
    let flashcards: Array<{ question: string; answer: string }> | null = null
    let quizQuestions: Array<{ question_type: string; prompt: string; options: string[] | null; answer: string; explanation: string | null }> | null = null
    let studyCollectionId: string | null = null

    if (isFlashcardRequest || isQuizRequest) {
      try {
        // Essayer d'extraire le JSON de la réponse
        const jsonMatch = aiResponse.match(/\[[\s\S]*\]/)
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0])
          
          if (isFlashcardRequest) {
            flashcards = parsed
          } else if (isQuizRequest) {
            quizQuestions = parsed
          }
          
          // Créer une study_collection liée à la collection principale
          if ((flashcards && flashcards.length > 0) || (quizQuestions && quizQuestions.length > 0)) {
            const collectionTitle = isFlashcardRequest 
              ? `Flashcards: ${searchTopic || collection.title}`
              : `Quiz: ${searchTopic || collection.title}`
            const collectionType = isFlashcardRequest ? 'flashcard' : 'quiz'
            
            // Tenter de créer la collection en gérant les doublons via une boucle
            let finalTitle = collectionTitle
            let counter = 1
            let studyCollection = null
            
            while (!studyCollection && counter <= 50) {
                 const { data, error: createError } = await admin
                  .from("study_collections")
                  .insert({
                    user_id: user.id,
                    collection_id: targetId, // Lier à la matière principale
                    title: finalTitle,
                    type: collectionType,
                    tags: searchTopic ? [searchTopic] : [],
                    status: "ready",
                    total_sources: documentContents.length,
                    total_flashcards: flashcards?.length || 0,
                    total_quiz: quizQuestions?.length || 0,
                  })
                  .select("id")
                  .single()
                  
                  if (!createError && data) {
                      studyCollection = data
                  } else if (createError && createError.code === '23505') {
                      // Doublon détecté, on incrémente et on réessaie
                      finalTitle = `${collectionTitle} ${counter}`
                      counter++
                  } else {
                      // Autre erreur réelle
                      console.error("[POST /api/chat/subject] Erreur création:", createError)
                      break
                  }
            }
            
            if (counter > 50) {
                return NextResponse.json({ 
                    error: `Trop de collections portent un nom similaire. Veuillez faire le ménage.`,
                    response: `Trop de collections portent un nom similaire. Veuillez supprimer les anciennes versions.`
                  }, { status: 409 })
            }

            if (studyCollection) {
              studyCollectionId = studyCollection.id

              // Insérer les flashcards
              if (flashcards && flashcards.length > 0) {
                const flashcardInserts = flashcards.map((fc, index) => ({
                  collection_id: studyCollection.id,
                  question: fc.question,
                  answer: fc.answer,
                  order_index: index,
                  tags: searchTopic ? [searchTopic] : [],
                  metadata: {},
                }))

                await admin
                  .from("study_collection_flashcards")
                  .insert(flashcardInserts)
              }

              // Insérer les questions de quiz
              if (quizQuestions && quizQuestions.length > 0) {
                const quizInserts = quizQuestions.map((q, index) => ({
                  collection_id: studyCollection.id,
                  question_type: q.question_type || "multiple_choice",
                  prompt: q.prompt,
                  options: q.options,
                  answer: q.answer,
                  explanation: q.explanation,
                  order_index: index,
                  tags: searchTopic ? [searchTopic] : [],
                  metadata: {},
                }))

                await admin
                  .from("study_collection_quiz_questions")
                  .insert(quizInserts)
              }
            }
          }
        }
      } catch (error) {
        console.error("[POST /api/chat/subject] Erreur lors de la création:", error)
        // Continuer même si la création échoue
      }
    } else if (isSummaryRequest) {
      // Pour les résumés, on crée aussi une study_collection pour le sauvegarder
      try {
        let summaryTitle = `Résumé: ${searchTopic || collection.title}`
        let counter = 1
        let studyCollection = null
        
        while (!studyCollection && counter <= 50) {
            const { data, error: createError } = await admin
              .from("study_collections")
              .insert({
                user_id: user.id,
                collection_id: targetId,
                title: summaryTitle,
                type: "summary",
                tags: searchTopic ? [searchTopic] : ["résumé"],
                status: "ready",
                total_sources: documentContents.length,
                total_flashcards: 0,
                total_quiz: 0,
                metadata: {
                  summary: aiResponse, // Sauvegarder le résumé dans les métadonnées
                  notes: []
                }
              })
              .select("id")
              .single()
              
            if (!createError && data) {
                studyCollection = data
            } else if (createError && createError.code === '23505') {
                 // Doublon, on incrémente
                 summaryTitle = `Résumé: ${searchTopic || collection.title} ${counter}`
                 counter++
            } else {
                 console.error("[POST /api/chat/subject] Erreur sauvegarde résumé:", createError)
                 break
            }
        }
        
        if (counter > 50) {
             return NextResponse.json({ 
                error: "Impossible de créer le résumé (trop de doublons)",
                response: "Trop de résumés portent un nom similaire. Veuillez faire le ménage."
              }, { status: 409 })
        }

        if (studyCollection) {
          studyCollectionId = studyCollection.id
          console.log(`[POST /api/chat/subject] Résumé sauvegardé dans study_collection ${studyCollectionId}`)
        }
      } catch (error) {
        console.error("[POST /api/chat/subject] Erreur lors de la sauvegarde du résumé:", error)
      }
    }

    return NextResponse.json({
      response: aiResponse,
      mentionedDocuments: documentContents.map((d) => ({ id: d.id, title: d.title })),
      isFlashcardRequest,
      isQuizRequest,
      isSummaryRequest,
      flashcards: flashcards || undefined,
      quizQuestions: quizQuestions || undefined,
      studyCollectionId: studyCollectionId || undefined,
      searchTopic: searchTopic || undefined,
    })
  } catch (err: any) {
    console.error("[POST /api/chat/subject] ❌ Exception:", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

