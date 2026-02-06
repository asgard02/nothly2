import { setTimeout as sleep } from "node:timers/promises"

import { getSupabaseAdmin } from "@/lib/db"
import {
  updateJob,
  type AsyncJob,
  type JobStatus,
} from "@/lib/jobs"
import {
  processDocumentGenerationJob,
  type DocumentGenerationJobPayload,
} from "@/lib/documents/processor"

const BASE_POLL_INTERVAL_MS = Number(process.env.JOB_POLL_INTERVAL_MS || 2000)
const MAX_POLL_INTERVAL_MS = 30000
const BACKOFF_MULTIPLIER = 1.5
const JOB_TIMEOUT_MS = 5 * 60 * 1000

/** Log structuré (une ligne JSON par message) pour agrégation en prod */
function log(level: "info" | "warn" | "error", msg: string, meta?: Record<string, unknown>) {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    worker: "document-generation",
    msg,
    ...meta,
  })
  if (level === "error") console.error(line)
  else if (level === "warn") console.warn(line)
  else console.log(line)
}

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
    return null
  }

  log("info", "job_claimed", { jobId: claimedJob.id, documentId: (claimedJob.payload as any)?.documentId })
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
      log("error", "update_job_failed", { jobId: job.id, reason: "payload_missing", err: (e as Error)?.message })
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
    log("warn", "set_progress_failed", { jobId: job.id, err: (e as Error)?.message })
  }

  // Créer un timeout pour le job
  const timeoutId = setTimeout(async () => {
    const elapsed = Date.now() - startTime
    log("error", "job_timeout", { jobId: job.id, documentId: payload.documentId, elapsedMs: elapsed })
    try {
      await updateJob(job.id, {
        status: "failed",
        error: `Job timeout after ${JOB_TIMEOUT_MS}ms`,
        finishedAt: new Date(),
      })
    } catch (e) {
      log("error", "update_job_failed", { jobId: job.id, reason: "timeout", err: (e as Error)?.message })
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
    log("info", "job_succeeded", {
      jobId: job.id,
      documentId: payload.documentId,
      sectionsCount: (result as any)?.sectionsCount,
      elapsedMs: Date.now() - startTime,
    })
  } catch (error: any) {
    clearTimeout(timeoutId)
    log("error", "job_failed", {
      jobId: job.id,
      documentId: payload.documentId,
      error: error?.message || String(error),
      elapsedMs: Date.now() - startTime,
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
        log("warn", "document_status_update_failed", { documentId: payload.documentId, err: updateError?.message })
      }
    }

    await updateJob(job.id, {
      status: "failed",
      error: error?.message || String(error),
      finishedAt: new Date(),
    }).catch((e) => log("error", "update_job_status_failed", { jobId: job.id, err: (e as Error)?.message }))
  }
}

async function main() {
  log("info", "worker_started", { pollIntervalMs: BASE_POLL_INTERVAL_MS, timeoutMs: JOB_TIMEOUT_MS })
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
  log("error", "fatal", { err: (error as Error)?.message ?? String(error) })
  process.exit(1)
})

