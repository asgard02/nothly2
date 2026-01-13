import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"
import { getSupabaseAdmin } from "@/lib/db"

export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get("q") || ""
    const typeFilter = searchParams.get("type") || "all"

    if (!query || query.length < 2) {
      return NextResponse.json({ results: [] })
    }

    const searchQuery = query.toLowerCase().trim()
    const results: Array<{
      id: string
      type: "document" | "flashcard" | "quiz" | "collection" | "subject"
      title: string
      description?: string
      url: string
      subjectName?: string
      subjectId?: string
      metadata?: {
        tags?: string[]
        createdAt?: string
        [key: string]: unknown
      }
    }> = []

    // Recherche dans les collections (subjects) - d'abord pour avoir les noms
    const { data: allCollections } = await admin
      .from("collections")
      .select("id, title")
      .eq("user_id", user.id)

    const collectionMap = new Map<string, string>()
    if (allCollections) {
      allCollections.forEach((coll) => {
        collectionMap.set(coll.id, coll.title)
      })
    }

    // Recherche dans les documents (titre, nom de fichier, contenu des sections)
    // IMPORTANT: Ne retourner QUE des documents quand le filtre est "document"
    if (typeFilter === "all" || typeFilter === "document") {
      // Recherche dans les titres et noms de fichiers
      // Ne retourner que les documents avec status 'ready'
      const { data: documents, error: docError } = await admin
        .from("documents")
        .select("id, title, original_filename, tags, created_at, collection_id")
        .eq("user_id", user.id)
        .eq("status", "ready")
        .or(`title.ilike.%${searchQuery}%,original_filename.ilike.%${searchQuery}%`)
        .limit(10)

      if (!docError && documents) {
        documents.forEach((doc) => {
          results.push({
            id: doc.id,
            type: "document",
            title: doc.title,
            description: doc.original_filename,
            url: doc.collection_id ? `/workspace/subjects/${doc.collection_id}?document=${doc.id}` : `/workspace/subjects?document=${doc.id}`,
            subjectName: doc.collection_id ? collectionMap.get(doc.collection_id) : undefined,
            subjectId: doc.collection_id || undefined,
            metadata: {
              tags: Array.isArray(doc.tags) ? doc.tags : [],
              createdAt: doc.created_at,
            },
          })
        })
      }

      // Recherche dans le contenu des sections de documents
      const { data: sections, error: sectionsError } = await admin
        .from("document_sections")
        .select(`
          id,
          heading,
          content,
          document_versions!inner(
            document_id,
            documents!inner(
              id,
              title,
              collection_id,
              user_id,
              created_at
            )
          )
        `)
        .or(`heading.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%`)
        .limit(20)

      if (!sectionsError && sections) {
        const seenDocs = new Set<string>()
        sections.forEach((section: any) => {
          const doc = section.document_versions?.documents
          if (doc && doc.user_id === user.id) {
            const docKey = `${doc.id}-section`
            if (!seenDocs.has(docKey)) {
              seenDocs.add(docKey)
              results.push({
                id: `${doc.id}-section-${section.id}`,
                type: "document",
                title: `${doc.title} - ${section.heading}`,
                description: section.content.substring(0, 100) + "...",
                url: doc.collection_id ? `/workspace/subjects/${doc.collection_id}?document=${doc.id}` : `/workspace/subjects?document=${doc.id}`,
                subjectName: doc.collection_id ? collectionMap.get(doc.collection_id) : undefined,
                subjectId: doc.collection_id || undefined,
                metadata: {
                  createdAt: doc.created_at,
                },
              })
            }
          }
        })
      }
    }

    // Recherche dans les collections (subjects)
    if (typeFilter === "all" || typeFilter === "subject") {
      const { data: collections, error: collError } = await admin
        .from("collections")
        .select("id, title, created_at")
        .eq("user_id", user.id)
        .ilike("title", `%${searchQuery}%`)
        .limit(10)

      if (!collError && collections) {
        collections.forEach((coll) => {
          results.push({
            id: coll.id,
            type: "subject",
            title: coll.title,
            description: "Matière",
            url: `/workspace/subjects/${coll.id}`,
            metadata: {
              createdAt: coll.created_at,
            },
          })
        })
      }
    }

    // Recherche dans les flashcards (contenu question/answer)
    if (typeFilter === "all" || typeFilter === "flashcard") {
      // D'abord, rechercher les collections de flashcards par titre
      const { data: studyCollections, error: studyError } = await admin
        .from("study_collections")
        .select("id, title, tags, status, total_flashcards, total_quiz, created_at, collection_id")
        .eq("user_id", user.id)
        .eq("status", "ready")
        .gt("total_flashcards", 0)
        .ilike("title", `%${searchQuery}%`)
        .limit(5)

      const seenCollectionIds = new Set<string>()
      
      if (!studyError && studyCollections) {
        // Vérifier pour chaque collection qu'elle a vraiment des flashcards
        for (const sc of studyCollections) {
          const { count } = await admin
            .from("study_collection_flashcards")
            .select("*", { count: "exact", head: true })
            .eq("collection_id", sc.id)
          
          const flashcardCount = count || 0
          if (flashcardCount > 0) {
            seenCollectionIds.add(sc.id)
            const subjectName = sc.collection_id ? collectionMap.get(sc.collection_id) : undefined
            results.push({
              id: `${sc.id}-flashcards`,
              type: "flashcard",
              title: `${sc.title} (Flashcards)`,
              description: `${flashcardCount} flashcards${subjectName ? ` - ${subjectName}` : ""}`,
              url: sc.collection_id ? `/workspace/subjects/${sc.collection_id}?studyCollection=${sc.id}&tab=flashcards` : `/workspace/subjects?studyCollection=${sc.id}&tab=flashcards`,
              subjectName: subjectName,
              subjectId: sc.collection_id || undefined,
              metadata: {
                tags: Array.isArray(sc.tags) ? sc.tags : [],
                createdAt: sc.created_at,
              },
            })
          }
        }
      }

      // Ensuite, rechercher les flashcards individuelles (seulement si la collection n'a pas déjà été trouvée)
      const { data: flashcards, error: flashcardError } = await admin
        .from("study_collection_flashcards")
        .select(`
          id,
          question,
          answer,
          collection_id,
          study_collections!inner(
            id,
            title,
            collection_id,
            user_id,
            status,
            created_at
          )
        `)
        .eq("study_collections.user_id", user.id)
        .eq("study_collections.status", "ready")
        .or(`question.ilike.%${searchQuery}%,answer.ilike.%${searchQuery}%`)
        .limit(15)

      if (!flashcardError && flashcards) {
        flashcards.forEach((fc: any) => {
          const sc = fc.study_collections
          // Vérifier que la collection existe, appartient à l'utilisateur, et n'a pas déjà été ajoutée
          if (sc && sc.user_id === user.id && sc.id && !seenCollectionIds.has(sc.id)) {
            const subjectName = sc.collection_id ? collectionMap.get(sc.collection_id) : sc.title
            results.push({
              id: `flashcard-${fc.id}`,
              type: "flashcard",
              title: fc.question.substring(0, 60) + (fc.question.length > 60 ? "..." : ""),
              description: `Flashcard${subjectName ? ` - ${subjectName}` : ""}`,
              url: sc.collection_id ? `/workspace/subjects/${sc.collection_id}?studyCollection=${sc.id}&tab=flashcards` : `/workspace/subjects?studyCollection=${sc.id}&tab=flashcards`,
              subjectName: subjectName,
              subjectId: sc.collection_id || undefined,
              metadata: {
                createdAt: sc.created_at,
              },
            })
          }
        })
      }
    }

    // Recherche dans les quiz (prompt, options, answer, explanation)
    if (typeFilter === "all" || typeFilter === "quiz") {
      // D'abord, rechercher les collections de quiz par titre
      const { data: studyCollectionsQuiz, error: studyQuizError } = await admin
        .from("study_collections")
        .select("id, title, tags, status, total_flashcards, total_quiz, created_at, collection_id")
        .eq("user_id", user.id)
        .eq("status", "ready")
        .gt("total_quiz", 0)
        .ilike("title", `%${searchQuery}%`)
        .limit(5)

      const seenQuizCollectionIds = new Set<string>()
      
      if (!studyQuizError && studyCollectionsQuiz) {
        // Vérifier pour chaque collection qu'elle a vraiment des quiz
        for (const sc of studyCollectionsQuiz) {
          const { count } = await admin
            .from("study_collection_quiz_questions")
            .select("*", { count: "exact", head: true })
            .eq("collection_id", sc.id)
          
          const quizCount = count || 0
          if (quizCount > 0) {
            seenQuizCollectionIds.add(sc.id)
            const subjectName = sc.collection_id ? collectionMap.get(sc.collection_id) : undefined
            results.push({
              id: `${sc.id}-quiz`,
              type: "quiz",
              title: `${sc.title} (Quiz)`,
              description: `${quizCount} questions${subjectName ? ` - ${subjectName}` : ""}`,
              url: sc.collection_id ? `/workspace/subjects/${sc.collection_id}?studyCollection=${sc.id}&tab=quiz` : `/workspace/subjects?studyCollection=${sc.id}&tab=quiz`,
              subjectName: subjectName,
              subjectId: sc.collection_id || undefined,
              metadata: {
                tags: Array.isArray(sc.tags) ? sc.tags : [],
                createdAt: sc.created_at,
              },
            })
          }
        }
      }

      // Ensuite, rechercher les questions de quiz individuelles (seulement si la collection n'a pas déjà été trouvée)
      const { data: quizQuestions, error: quizError } = await admin
        .from("study_collection_quiz_questions")
        .select(`
          id,
          prompt,
          options,
          answer,
          explanation,
          collection_id,
          study_collections!inner(
            id,
            title,
            collection_id,
            user_id,
            status,
            created_at
          )
        `)
        .eq("study_collections.user_id", user.id)
        .eq("study_collections.status", "ready")
        .or(`prompt.ilike.%${searchQuery}%,answer.ilike.%${searchQuery}%,explanation.ilike.%${searchQuery}%`)
        .limit(15)

      if (!quizError && quizQuestions) {
        quizQuestions.forEach((qq: any) => {
          const sc = qq.study_collections
          // Vérifier que la collection existe, appartient à l'utilisateur, et n'a pas déjà été ajoutée
          if (sc && sc.user_id === user.id && sc.id && !seenQuizCollectionIds.has(sc.id)) {
            const subjectName = sc.collection_id ? collectionMap.get(sc.collection_id) : sc.title
            // Rechercher aussi dans les options (JSON)
            const optionsMatch = qq.options && typeof qq.options === 'object' 
              ? JSON.stringify(qq.options).toLowerCase().includes(searchQuery)
              : false

            if (qq.prompt.toLowerCase().includes(searchQuery) || 
                qq.answer.toLowerCase().includes(searchQuery) || 
                (qq.explanation && qq.explanation.toLowerCase().includes(searchQuery)) ||
                optionsMatch) {
              results.push({
                id: `quiz-${qq.id}`,
                type: "quiz",
                title: qq.prompt.substring(0, 60) + (qq.prompt.length > 60 ? "..." : ""),
                description: `Question de quiz${subjectName ? ` - ${subjectName}` : ""}`,
                url: sc.collection_id ? `/workspace/subjects/${sc.collection_id}?studyCollection=${sc.id}&tab=quiz` : `/workspace/subjects?studyCollection=${sc.id}&tab=quiz`,
                subjectName: subjectName,
                subjectId: sc.collection_id || undefined,
                metadata: {
                  createdAt: sc.created_at,
                },
              })
            }
          }
        })
      }
    }

    // Éliminer les doublons basés sur l'ID
    const seenIds = new Set<string>()
    const uniqueResults = results.filter((result) => {
      if (seenIds.has(result.id)) {
        return false
      }
      seenIds.add(result.id)
      return true
    })

    // Trier par pertinence (titre qui commence par la query en premier)
    uniqueResults.sort((a, b) => {
      const aStartsWith = a.title.toLowerCase().startsWith(searchQuery)
      const bStartsWith = b.title.toLowerCase().startsWith(searchQuery)
      if (aStartsWith && !bStartsWith) return -1
      if (!aStartsWith && bStartsWith) return 1
      return 0
    })

    return NextResponse.json({ results: uniqueResults.slice(0, 20) })
  } catch (error: any) {
    console.error("[GET /api/search] ❌ Erreur:", error)
    return NextResponse.json({ error: error.message || "Erreur lors de la recherche" }, { status: 500 })
  }
}
