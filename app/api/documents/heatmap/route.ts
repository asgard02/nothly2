import { createServerClient } from "@/lib/supabase-server"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const supabase = await createServerClient()
  
  if (!supabase) {
    return NextResponse.json({ error: "Supabase configuration missing" }, { status: 500 })
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { documentIds, topic } = await req.json()

    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      return NextResponse.json({ results: [] })
    }

    if (!topic || !topic.trim()) {
      // If no topic, return empty scores (or all 100?)
      // Let's return empty scores, implying "no relevance filtering"
      return NextResponse.json({ results: [] })
    }

    const topicTerms = topic.toLowerCase().split(/\s+/).filter((t: string) => t.length > 2)

    // Fetch sections for all documents
    const { data: sections, error } = await supabase
      .from("document_sections")
      .select("id, document_version_id, content, order_index")
      .in("document_version_id", (
        await supabase
          .from("document_versions")
          .select("id")
          .in("document_id", documentIds)
          // We ideally want the *current* version, but for simplicity let's grab all versions 
          // linked to these docs. A better query would be to join documents.
      ).data?.map((v: { id: string }) => v.id) || [])
      .order("order_index")

    if (error) throw error

    // We need to map version_id back to document_id
    const { data: versions } = await supabase
      .from("document_versions")
      .select("id, document_id")
      .in("id", sections.map((s: { document_version_id: string }) => s.document_version_id))

    const versionToDocMap = new Map(versions?.map((v: { id: string; document_id: string }) => [v.id, v.document_id]))

    // Calculate scores
    const results = documentIds.map((docId: string) => {
      const docSections = sections.filter((s: { document_version_id: string }) => versionToDocMap.get(s.document_version_id) === docId)
      
      const sectionScores = docSections.map((section: { id: string; order_index: number; content: string }) => {
        const contentLower = section.content.toLowerCase()
        let matchCount = 0
        topicTerms.forEach((term: string) => {
          // Simple frequency count
          const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
          const matches = contentLower.match(regex)
          if (matches) matchCount += matches.length
        })

        // Normalize by length (density) to avoid favoring long sections too much
        // But also favor raw count a bit.
        // Score = (matches / length) * 1000 + matches * 2
        const density = contentLower.length > 0 ? (matchCount / contentLower.length) : 0
        const score = Math.min(100, Math.round((density * 5000) + (matchCount * 5))) 
        
        return {
          id: section.id,
          index: section.order_index,
          score: score,
          preview: section.content.substring(0, 100) + "..."
        }
      })

      // Document total relevance (max section score? or average?)
      const maxScore = Math.max(...sectionScores.map((s: { score: number }) => s.score), 0)
      
      return {
        documentId: docId,
        relevance: maxScore,
        sections: sectionScores
      }
    })

    return NextResponse.json({ results })

  } catch (error) {
    console.error("Heatmap analysis error:", error)
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 })
  }
}
