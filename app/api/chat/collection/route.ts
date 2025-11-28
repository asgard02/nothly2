import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"
import { getSupabaseAdmin } from "@/lib/db"

export const dynamic = "force-dynamic"

// POST /api/chat/collection - Chat avec contexte de collection et documents mentionnés
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

    const admin = getSupabaseAdmin()
    if (!admin) {
      return NextResponse.json({ error: "Configuration Supabase manquante" }, { status: 500 })
    }

    const body = await request.json()
    const { collectionId, message, mentionedDocumentIds } = body

    if (!collectionId || !message) {
      return NextResponse.json({ error: "collectionId et message sont requis" }, { status: 400 })
    }

    // Vérifier que la collection appartient à l'utilisateur
    const { data: collection, error: collectionError } = await admin
      .from("collections")
      .select("id, title")
      .eq("id", collectionId)
      .eq("user_id", user.id)
      .single()

    if (collectionError || !collection) {
      return NextResponse.json({ error: "Collection non trouvée" }, { status: 404 })
    }

    // Récupérer les documents de la collection (tous ou seulement ceux mentionnés)
    let documentIds: string[] = []
    
    if (mentionedDocumentIds && mentionedDocumentIds.length > 0) {
      // Seulement les documents mentionnés
      documentIds = mentionedDocumentIds
    } else {
      // Tous les documents de la collection
      const { data: allDocs } = await admin
        .from("documents")
        .select("id")
        .eq("collection_id", collectionId)
        .eq("user_id", user.id)
      
      documentIds = allDocs?.map((d: any) => d.id) || []
    }

    // Vérifier si la collection contient des documents
    if (documentIds.length === 0) {
      return NextResponse.json({ 
        error: "Aucun document dans cette collection.",
        response: "Veuillez d'abord ajouter des documents PDF à cette collection avant de poser des questions ou de créer des flashcards/quiz."
      }, { status: 400 })
    }

    // Détecter intelligemment l'intention avec l'IA (flashcard/quiz/question normale/résumé)
    // Cela permet de détecter même sans mots-clés explicites
    let isFlashcardRequest = false
    let isQuizRequest = false
    let isSummaryRequest = false
    let searchTopic: string | null = null

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
              content: `Analyse le message de l'utilisateur et détermine son intention. Réponds UNIQUEMENT avec un JSON de cette forme:
{
  "intent": "flashcard" | "quiz" | "summary" | "question",
  "topic": "sujet extrait ou null"
}

Règles:
- "flashcard" si l'utilisateur veut créer des cartes de révision, mémoriser, réviser, apprendre par cœur, étudier
- "quiz" si l'utilisateur veut tester ses connaissances, faire un test, un examen, des questions, évaluer
- "summary" si l'utilisateur veut un résumé, une synthèse, un récapitulatif, résumer le contenu
- "question" pour toute autre demande (explication, définition, etc.)
- "topic" : extrait le sujet principal si mentionné, sinon null

Exemples:
- "fais des flashcards sur les limites" -> {"intent": "flashcard", "topic": "limites"}
- "je veux réviser les fonctions" -> {"intent": "flashcard", "topic": "fonctions"}
- "crée un quiz sur les dérivées" -> {"intent": "quiz", "topic": "dérivées"}
- "résume-moi ce cours" -> {"intent": "summary", "topic": null}
- "fais une synthèse sur la guerre froide" -> {"intent": "summary", "topic": "guerre froide"}
- "explique-moi les limites" -> {"intent": "question", "topic": "limites"}`
            },
            {
              role: "user",
              content: message,
            },
          ],
          max_tokens: 100,
          temperature: 0.3,
        }),
      })

      if (intentResponse.ok) {
        const intentData = await intentResponse.json()
        const responseText = intentData.choices?.[0]?.message?.content?.trim()
        
        try {
          // Nettoyer la réponse pour extraire le JSON (enlever markdown si présent)
          const jsonMatch = responseText.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0])
            isFlashcardRequest = parsed.intent === "flashcard"
            isQuizRequest = parsed.intent === "quiz"
            isSummaryRequest = parsed.intent === "summary"
            searchTopic = parsed.topic || null
          }
        } catch (parseError) {
          console.warn("[POST /api/chat/collection] Erreur parsing intention:", parseError)
        }
      }
    } catch (error) {
      console.warn("[POST /api/chat/collection] Erreur détection intention IA:", error)
    }

    // Fallback: détection par mots-clés si l'IA n'a pas fonctionné
    if (!isFlashcardRequest && !isQuizRequest && !isSummaryRequest) {
      const flashcardKeywords = ["flashcard", "carte", "cartes", "révision", "mémorisation", "apprendre", "étudier", "réviser", "mémoriser"]
      const quizKeywords = ["quiz", "question", "questions", "test", "examen", "évaluation", "interro", "qcm", "teste", "tester"]
      const summaryKeywords = ["résumé", "résumer", "synthèse", "synthétiser", "récapitulatif", "récapituler", "resumer", "synthese"]
      
      isFlashcardRequest = flashcardKeywords.some(keyword => message.toLowerCase().includes(keyword))
      isQuizRequest = quizKeywords.some(keyword => message.toLowerCase().includes(keyword))
      isSummaryRequest = summaryKeywords.some(keyword => message.toLowerCase().includes(keyword))
    }

    // Récupérer le contenu des documents pour le contexte
    // Si c'est une demande de flashcards/quiz/résumé, on cherche les sections pertinentes
    const documentContents: Array<{ id: string; title: string; content: string; sections?: Array<{ content: string; order_index: number }> }> = []
    
    console.log(`[POST /api/chat/collection] 🔍 Traitement de ${documentIds.length} document(s) pour la collection ${collectionId}`)
    console.log(`[POST /api/chat/collection] 📋 Document IDs:`, documentIds)
    
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
        console.warn(`[POST /api/chat/collection] Document ${docId} non trouvé:`, docError)
        skippedDocs.push({ id: docId, title: "Inconnu", reason: "Document non trouvé" })
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
        console.warn(`[POST /api/chat/collection] Aucune version trouvée pour le document ${docId} (titre: ${doc.title})`)
        skippedDocs.push({ id: docId, title: doc.title, reason: "Aucune version trouvée" })
        continue
      }
      
      console.log(`[POST /api/chat/collection] Document ${docId} (${doc.title}) - Version ID: ${versionId}`)
      
      // Récupérer le raw_text de la version d'abord (plus fiable que les sections)
      const { data: version, error: versionError } = await admin
        .from("document_versions")
        .select("raw_text")
        .eq("id", versionId)
        .single()

      if (versionError) {
        console.warn(`[POST /api/chat/collection] Erreur récupération version pour ${docId}:`, versionError)
        skippedDocs.push({ id: docId, title: doc.title, reason: `Erreur récupération version: ${versionError.message}` })
        continue
      }

      // Log pour debug
      if (version) {
        const rawTextLength = version.raw_text ? version.raw_text.length : 0
        const hasRawText = version.raw_text && version.raw_text.trim().length > 0
        console.log(`[POST /api/chat/collection] Document ${docId} - raw_text: ${rawTextLength} caractères, hasContent: ${hasRawText}`)
      } else {
        console.warn(`[POST /api/chat/collection] Document ${docId} - Version ${versionId} non trouvée`)
        continue
      }

      // Récupérer les sections du document avec leur index (optionnel)
      const { data: sections, error: sectionsError } = await admin
        .from("document_sections")
        .select("id, content, order_index")
        .eq("document_version_id", versionId)
        .order("order_index", { ascending: true })

      if (sectionsError) {
        console.warn(`[POST /api/chat/collection] Erreur récupération sections pour ${docId}:`, sectionsError)
        // Ne pas continuer, on peut utiliser raw_text à la place
      }

      // Déterminer le contenu à utiliser : sections si disponibles, sinon raw_text
      let relevantContent: string = ""
      let relevantSections: Array<{ content: string; order_index: number }> = []

      if (sections && sections.length > 0) {
        // Utiliser les sections si disponibles
        console.log(`[POST /api/chat/collection] Document ${docId} (${doc.title}) - ${sections.length} sections trouvées`)
        
        if ((isFlashcardRequest || isQuizRequest || isSummaryRequest) && searchTopic) {
          // Rechercher les sections pertinentes au sujet
          const topicWords = searchTopic.toLowerCase().split(/\s+/)
          
          const filteredSections = sections.filter((s: any) => {
            const contentLower = s.content.toLowerCase()
            return topicWords.some(word => contentLower.includes(word))
          })

          if (filteredSections.length > 0) {
            // Utiliser seulement les sections pertinentes
            relevantSections = filteredSections.map((s: any) => ({
              content: s.content,
              order_index: s.order_index
            }))
            relevantContent = filteredSections.map((s: any) => s.content).join("\n\n")
          } else {
            // Si aucune section ne correspond, utiliser toutes les sections
            relevantSections = sections.map((s: any) => ({
              content: s.content,
              order_index: s.order_index
            }))
            relevantContent = sections.map((s: any) => s.content).join("\n\n")
          }
        } else {
          // Pour les questions normales ou résumé global, utiliser toutes les sections
          relevantSections = sections.map((s: any) => ({
            content: s.content,
            order_index: s.order_index
          }))
          relevantContent = sections.map((s: any) => s.content).join("\n\n")
        }
      } else if (version && version.raw_text && version.raw_text.trim().length > 0) {
        // Utiliser raw_text comme fallback si pas de sections
        console.log(`[POST /api/chat/collection] Document ${docId} (${doc.title}) - Utilisation du raw_text (${version.raw_text.length} caractères)`)
        relevantContent = version.raw_text.trim()
        relevantSections = []
      } else {
        // Aucun contenu disponible - log détaillé pour debug
        const rawTextStatus = version?.raw_text 
          ? (version.raw_text.trim().length > 0 ? `raw_text existe mais vide (${version.raw_text.length} chars)` : `raw_text null/undefined`)
          : "version non trouvée"
        console.warn(`[POST /api/chat/collection] Aucun contenu disponible pour le document ${docId} (${doc.title}, version ${versionId}) - ${rawTextStatus}`)
        skippedDocs.push({ 
          id: docId, 
          title: doc.title, 
          reason: version?.raw_text ? `raw_text vide (${version.raw_text.length} chars)` : "raw_text manquant" 
        })
        continue
      }

      if (!relevantContent || relevantContent.trim().length === 0) {
        console.warn(`[POST /api/chat/collection] Contenu vide pour le document ${docId}`)
        skippedDocs.push({ id: docId, title: doc.title, reason: "Contenu vide après traitement" })
        continue
      }

      documentContents.push({
        id: doc.id,
        title: doc.title,
        content: relevantContent.substring(0, 20000), // Limite pour les flashcards/résumés
        sections: relevantSections,
      })
    }

    // Log pour debug
    console.log(`[POST /api/chat/collection] Documents récupérés: ${documentContents.length}, Total contenu: ${documentContents.reduce((sum, d) => sum + d.content.length, 0)} caractères`)
    if (skippedDocs.length > 0) {
      console.warn(`[POST /api/chat/collection] Documents ignorés (${skippedDocs.length}):`, skippedDocs.map(d => `${d.title} (${d.reason})`).join(", "))
    }

    // Construire le contexte pour l'IA
    const contextParts: string[] = []
    contextParts.push(`Collection: ${collection.title}`)
    
    if (documentContents.length > 0) {
      contextParts.push("\nDocuments disponibles:")
      documentContents.forEach((doc) => {
        contextParts.push(`\n--- Document: ${doc.title} (ID: ${doc.id}) ---`)
        contextParts.push(doc.content)
      })
    } else {
      // Si aucun contenu n'a été trouvé, vérifier si les documents sont en cours de traitement
      const { data: docsStatus } = await admin
        .from("documents")
        .select("id, title, status")
        .eq("collection_id", collectionId)
        .eq("user_id", user.id)
      
      const processingDocs = docsStatus?.filter((d: any) => d.status === "processing") || []
      const readyDocs = docsStatus?.filter((d: any) => d.status === "ready") || []
      
      if (processingDocs.length > 0) {
        // Des documents sont en cours de traitement
        return NextResponse.json({ 
          error: "Les documents sont en cours de traitement. Veuillez patienter quelques instants et réessayer.",
          response: `Les documents suivants sont en cours de traitement : ${processingDocs.map((d: any) => d.title).join(", ")}. Veuillez attendre qu'ils soient prêts avant de créer des flashcards ou quiz.`
        }, { status: 400 })
      } else if (readyDocs.length === 0) {
        // Aucun document dans la collection
        return NextResponse.json({ 
          error: "Aucun document dans cette collection.",
          response: "Veuillez d'abord ajouter des documents PDF à cette collection."
        }, { status: 400 })
      } else {
        // Documents prêts mais pas de contenu extrait
        console.warn(`[POST /api/chat/collection] Aucun contenu trouvé pour la collection ${collectionId} malgré ${readyDocs.length} document(s) prêt(s)`)
        
        // Construire un message d'erreur détaillé avec les documents problématiques
        const docTitles = readyDocs.map((d: any) => d.title).join(", ")
        let errorDetails = `Les documents suivants n'ont pas de contenu texte extrait:\n${docTitles}\n\n`
        
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
          console.warn(`[POST /api/chat/collection] Documents sans contenu: ${problematicTitles}`)
          errorDetails = `Les documents suivants n'ont pas de contenu texte:\n${problematicTitles}\n\n`
        }
        
        // Construire un message d'erreur détaillé avec instructions
        const errorMessage = `${errorDetails}Causes possibles:\n- Les documents ont été uploadés avant que l'extraction de texte soit activée\n- Les PDFs sont des images scannées (sans texte extractible)\n- L'extraction de texte a échoué lors de l'upload\n\nSolutions:\n1. Exécuter le script de ré-extraction:\n   npx tsx scripts/re-extract-pdf-text.ts\n\n2. Vérifier les logs serveur pour voir quels documents sont ignorés\n\n3. Si le script ne fonctionne pas, re-uploader les documents`
        
        console.error(`[POST /api/chat/collection] ❌ Aucun contenu trouvé - ${readyDocs.length} document(s) prêt(s) mais aucun contenu texte`)
        console.error(`[POST /api/chat/collection] Documents sans contenu:`, docsWithoutContent.map((d: any) => d.title))
        
        return NextResponse.json({ 
          error: "Aucun contenu texte n'a pu être extrait des documents.",
          response: errorMessage
        }, { status: 400 })
      }
    }

    const context = contextParts.join("\n")
    
    // Log pour debug
    console.log(`[POST /api/chat/collection] Contexte construit: ${context.length} caractères, ${documentContents.length} documents`)

    // Appeler l'API OpenAI avec le contexte
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ 
        error: "Configuration OpenAI manquante",
        response: "Je ne peux pas répondre car l'API OpenAI n'est pas configurée. Voici le contexte que j'aurais utilisé:\n\n" + context.substring(0, 500) + "..."
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
${context.substring(0, 20000)}`
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
${context.substring(0, 20000)}`
    } else if (isSummaryRequest) {
      systemPrompt = `Tu es un assistant IA expert en synthèse de documents.
      
⚠️ IMPORTANT : Tu DOIS utiliser UNIQUEMENT le contenu fourni dans les documents ci-dessous.

L'utilisateur veut un résumé sur le sujet: "${searchTopic || 'le contenu global'}".

Rédige un résumé structuré, clair et complet du contenu fourni.
Le résumé doit être bien formaté (Markdown accepté) et mettre en avant les points clés.

Contexte des documents (UTILISE UNIQUEMENT CE CONTENU):
${context.substring(0, 20000)}`
    } else {
      systemPrompt = `Tu es un assistant IA qui aide l'utilisateur à comprendre et analyser ses documents PDF dans la collection "${collection.title}". 
            
Tu as accès au contenu des documents suivants. Utilise ce contexte pour répondre aux questions de l'utilisateur de manière précise et détaillée.

Contexte des documents:
${context.substring(0, 15000)}`
    }

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
        max_tokens: isFlashcardRequest || isQuizRequest || isSummaryRequest ? 4000 : 2000, // Plus de tokens pour les générations
        temperature: isFlashcardRequest || isQuizRequest ? 0.5 : 0.7, // Plus bas pour les flashcards/quiz
      }),
    })

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json().catch(() => ({}))
      console.error("[POST /api/chat/collection] ❌ Erreur OpenAI:", errorData)
      return NextResponse.json({ error: "Erreur lors de l'appel à l'IA" }, { status: 500 })
    }

    const aiData = await openaiResponse.json()
    const aiResponse = aiData.choices?.[0]?.message?.content || "Désolé, je n'ai pas pu générer de réponse."

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
            const { data: studyCollection, error: createError } = await admin
              .from("study_collections")
              .insert({
                user_id: user.id,
                collection_id: collectionId, // Lier à la collection principale
                title: isFlashcardRequest 
                  ? `Flashcards: ${searchTopic || collection.title}`
                  : `Quiz: ${searchTopic || collection.title}`,
                tags: searchTopic ? [searchTopic] : [],
                status: "ready",
                total_sources: documentContents.length,
                total_flashcards: flashcards?.length || 0,
                total_quiz: quizQuestions?.length || 0,
              })
              .select("id")
              .single()

            if (!createError && studyCollection) {
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
        console.error("[POST /api/chat/collection] Erreur lors de la création:", error)
        // Continuer même si la création échoue
      }
    } else if (isSummaryRequest) {
      // Pour les résumés, on crée aussi une study_collection pour le sauvegarder
      try {
        const { data: studyCollection, error: createError } = await admin
          .from("study_collections")
          .insert({
            user_id: user.id,
            collection_id: collectionId,
            title: `Résumé: ${searchTopic || collection.title}`,
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
          
        if (!createError && studyCollection) {
          studyCollectionId = studyCollection.id
          console.log(`[POST /api/chat/collection] Résumé sauvegardé dans study_collection ${studyCollectionId}`)
        }
      } catch (error) {
        console.error("[POST /api/chat/collection] Erreur lors de la sauvegarde du résumé:", error)
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
    console.error("[POST /api/chat/collection] ❌ Exception:", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

