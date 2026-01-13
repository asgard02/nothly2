import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/db";

export const dynamic = "force-dynamic";

// POST /api/flashcards/progress - Sauvegarder la progression d'une flashcard
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Configuration Supabase manquante" },
        { status: 500 }
      );
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const admin = getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: "Configuration Supabase manquante" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { flashcardId, quality } = body; // quality: 'easy' | 'medium' | 'hard'

    if (!flashcardId || !quality) {
      return NextResponse.json(
        { error: "Paramètres manquants" },
        { status: 400 }
      );
    }

    // Récupérer les stats existantes
    const { data: existingStats } = await admin
      .from("flashcard_stats")
      .select("*")
      .eq("flashcard_id", flashcardId)
      .eq("user_id", user.id)
      .single();

    // Valeurs par défaut (nouvelle carte)
    let easeFactor = existingStats?.ease_factor || 2.5;
    let interval = existingStats?.interval || 0;
    let repetitions = existingStats?.repetitions || 0;
    // let box = existingStats?.box || 0 // Gardé pour compatibilité arrière si besoin

    // Mapping qualité (0-5) pour SM-2
    // Hard = 1 (échec mais pas total 0)
    // Medium = 3 (passable)
    // Easy = 5 (parfait)
    let q = 0;
    if (quality === "easy") q = 5;
    else if (quality === "medium") q = 3;
    else q = 1; // hard

    // Algorithme SM-2
    if (q >= 3) {
      // Réussite
      if (repetitions === 0) {
        interval = 1;
      } else if (repetitions === 1) {
        interval = 6;
      } else {
        interval = Math.round(interval * easeFactor);
      }
      repetitions += 1;
    } else {
      // Echec -> Reset interval, mais on garde le easeFactor (ou on le baisse via la formule)
      repetitions = 0;
      interval = 1;
    }

    // Mise à jour du Ease Factor
    // Formule: EF' = EF + (0.1 - (5-q) * (0.08 + (5-q)*0.02))
    easeFactor = easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
    if (easeFactor < 1.3) easeFactor = 1.3;

    // Calcul date prochaine révision
    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + interval);

    // Mise à jour base de données
    const updateData = {
      last_reviewed_at: new Date().toISOString(),
      next_review_at: nextReview.toISOString(),
      difficulty: quality,
      updated_at: new Date().toISOString(),
      ease_factor: easeFactor,
      interval: interval,
      repetitions: repetitions,
      box: Math.min(5, repetitions), // On synchronise box avec repetitions pour l'affichage UI, max 5
    };

    if (existingStats) {
      await admin
        .from("flashcard_stats")
        .update(updateData)
        .eq("id", existingStats.id);
    } else {
      await admin.from("flashcard_stats").insert({
        user_id: user.id,
        flashcard_id: flashcardId,
        ...updateData,
      });
    }

    return NextResponse.json({ success: true, box: repetitions, nextReview });
  } catch (err: any) {
    console.error("[POST /api/flashcards/progress] ❌ Exception:", err);
    return NextResponse.json(
      { error: "Erreur serveur", details: err.message },
      { status: 500 }
    );
  }
}

// GET /api/flashcards/progress - Récupérer les stats
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Configuration Supabase manquante" },
        { status: 500 }
      );
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const admin = getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: "Configuration Supabase manquante" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const studySubjectId =
      searchParams.get("studySubjectId") ||
      searchParams.get("studyCollectionId");

    if (!studySubjectId) {
      return NextResponse.json(
        { error: "studySubjectId manquant" },
        { status: 400 }
      );
    }

    // 1. Récupérer les IDs des flashcards de cette collection
    const { data: flashcards } = await admin
      .from("study_collection_flashcards")
      .select("id")
      .eq("collection_id", studySubjectId);

    const flashcardIds = flashcards?.map((f) => f.id) || [];

    if (flashcardIds.length === 0) {
      return NextResponse.json({ stats: [] });
    }

    // 2. Récupérer les stats pour ces flashcards
    const { data: stats } = await admin
      .from("flashcard_stats")
      .select("*")
      .eq("user_id", user.id)
      .in("flashcard_id", flashcardIds);

    return NextResponse.json({ stats: stats || [] });
  } catch (err: any) {
    console.error("[GET /api/flashcards/progress] ❌ Exception:", err);
    return NextResponse.json(
      { error: "Erreur serveur", details: err.message },
      { status: 500 }
    );
  }
}
