import { setTimeout as sleep } from "node:timers/promises"

import { getSupabaseAdmin } from "@/lib/db"
import {
  getJob,
  updateJob,
  type AsyncJob,
  type JobStatus,
} from "@/lib/jobs"
import {
  processDocumentGenerationJob,
  type DocumentGenerationJobPayload,
} from "@/lib/documents/processor"

const BASE_POLL_INTERVAL_MS = Number(process.env.JOB_POLL_INTERVAL_MS || 2000)
const MAX_POLL_INTERVAL_MS = 30000 // 30 secondes max
const BACKOFF_MULTIPLIER = 1.5
const JOB_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes timeout par job

async function fetchNextPendingJob(): Promise<AsyncJob | null> {
  const admin = getSupabaseAdmin()
  if (!admin) {
    throw new Error("Supabase admin client is not configured")
  }

  // Méthode atomique pour éviter les race conditions :
  // 1. Trouver le premier job pending
  // 2. Mettre à jour son statut en "running" de manière atomique
  // 3. Si la mise à jour réussit, c'est qu'on a réussi à le "claim"
  const { data: pendingJobs, error: selectError } = await admin
    .from("async_jobs")
    .select("id")
    .eq("status", "pending")
    .eq("type", "document-generation")
    .order("created_at", { ascending: true })
    .limit(1)

  if (selectError || !pendingJobs || pendingJobs.length === 0) {
    return null
  }

  const jobId = pendingJobs[0].id

  // Tentative atomique de claim : UPDATE ... WHERE status = 'pending'
  // Si un autre worker a déjà pris le job, cette requête ne mettra à jour aucune ligne
  const { data: claimedJob, error: updateError } = await admin
    .from("async_jobs")
    .update({ status: "running", started_at: new Date().toISOString() })
    .eq("id", jobId)
    .eq("status", "pending") // Condition critique : seulement si toujours pending
    .select()
    .single()

  if (updateError || !claimedJob) {
    // Job déjà pris par un autre worker ou erreur
    return null
  }

  return claimedJob as AsyncJob
}

async function runJob(job: AsyncJob) {
  const payload = job.payload as DocumentGenerationJobPayload | null
  if (!payload) {
    try {
      await updateJob(job.id, {
        status: "failed",
        error: "Job payload missing",
        finishedAt: new Date(),
      })
    } catch (e) {
      console.error("[process-document-jobs] Failed to update job status (payload missing)", e)
    }
    return
  }

  let currentStatus: JobStatus = "running"
  const startTime = Date.now()

  // Le statut "running" a déjà été défini dans fetchNextPendingJob
  // On met juste à jour le progress initial
  try {
    await updateJob(job.id, {
      progress: 0,
    })
  } catch (e) {
    console.error("[process-document-jobs] Failed to set job progress", e)
  }

  // Créer un timeout pour le job
  const timeoutId = setTimeout(async () => {
    const elapsed = Date.now() - startTime
    console.error(`[process-document-jobs] Job ${job.id} timeout after ${elapsed}ms`)
    try {
      await updateJob(job.id, {
        status: "failed",
        error: `Job timeout after ${JOB_TIMEOUT_MS}ms`,
        finishedAt: new Date(),
      })
    } catch (e) {
      console.error("[process-document-jobs] Failed to update job status (timeout)", e)
    }
  }, JOB_TIMEOUT_MS)

  try {
    // Verify document exists
    const admin = getSupabaseAdmin()
    if (admin && payload.documentId) {
      const { data: doc, error: docError } = await admin
        .from("documents")
        .select("id")
        .eq("id", payload.documentId)
        .single()
      
      if (!doc || docError) {
        throw new Error(`Document ${payload.documentId} not found in DB (might have been deleted)`)
      }
    }

    const result = await processDocumentGenerationJob(payload, async (progress) => {
      if (progress >= 1) {
        return
      }
      // Silently fail progress updates
      await updateJob(job.id, { progress }).catch(() => {})
    })

    clearTimeout(timeoutId)
    await updateJob(job.id, {
      status: "succeeded",
      progress: 1,
      finishedAt: new Date(),
      result,
    })
  } catch (error: any) {
    clearTimeout(timeoutId)
    console.error("[process-document-jobs] job failed", {
      jobId: job.id,
      error: error?.message || error,
    })

    const admin = getSupabaseAdmin()
    if (admin && payload.documentId) {
      // Try to update document status to failed
        const { error: updateError } = await admin
        .from("documents")
        .update({
          status: "failed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", payload.documentId)
      
      if (updateError) {
        console.error("Failed to update document status to failed", updateError)
      }
    }

    await updateJob(job.id, {
      status: "failed",
      error: error?.message || String(error),
      finishedAt: new Date(),
    }).catch(e => console.error("Failed to update job status to failed", e))
  }
}

async function main() {
  console.log("[process-document-jobs] Worker started")
  let pollInterval = BASE_POLL_INTERVAL_MS
  let consecutiveEmptyPolls = 0

  while (true) {
    const pendingJob = await fetchNextPendingJob()

    if (!pendingJob) {
      consecutiveEmptyPolls++
      // Backoff exponentiel jusqu'à MAX_POLL_INTERVAL_MS
      pollInterval = Math.min(Math.floor(pollInterval * BACKOFF_MULTIPLIER), MAX_POLL_INTERVAL_MS)
      await sleep(pollInterval)
      continue
    }

    // Réinitialiser l'intervalle si un job est trouvé
    consecutiveEmptyPolls = 0
    pollInterval = BASE_POLL_INTERVAL_MS

    // Le job a déjà été marqué comme "running" dans fetchNextPendingJob
    // Pas besoin de vérifier à nouveau
    await runJob(pendingJob)
  }
}

main().catch((error) => {
  console.error("[process-document-jobs] Fatal error", error)
  process.exit(1)
})

