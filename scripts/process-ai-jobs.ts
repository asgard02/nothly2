import { setTimeout as sleep } from "node:timers/promises"

import { AI_GENERATION_JOB_TYPE, processAIGenerationJob, type AIGenerationJobPayload } from "@/lib/ai/jobs"
import { getSupabaseAdmin } from "@/lib/db"
import { getJob, updateJob, type AsyncJob, type JobStatus } from "@/lib/jobs"

const BASE_POLL_INTERVAL_MS = Number(process.env.JOB_POLL_INTERVAL_MS || 2000)
const MAX_POLL_INTERVAL_MS = 30000 // 30 secondes max
const BACKOFF_MULTIPLIER = 1.5
const JOB_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes timeout par job

async function fetchNextPendingJob(): Promise<AsyncJob | null> {
  const admin = getSupabaseAdmin()
  if (!admin) {
    throw new Error("Supabase admin client is not configured")
  }

  // Méthode atomique pour éviter les race conditions
  const { data: pendingJobs, error: selectError } = await admin
    .from("async_jobs")
    .select("id")
    .eq("status", "pending")
    .eq("type", AI_GENERATION_JOB_TYPE)
    .order("created_at", { ascending: true })
    .limit(1)

  if (selectError) {
    console.error("[process-ai-jobs] fetchNextPendingJob error", selectError)
    // @ts-ignore - Supabase error typing can be loose
    if (selectError.message === 'Internal server error.' || selectError.code === '500') {
       console.error("[process-ai-jobs] 🚨 CRITICAL: Supabase returned 'Internal server error'. Your project might be PAUSED or the database is down. Check: https://supabase.com/dashboard/project/_")
    }
    return null
  }

  if (!pendingJobs || pendingJobs.length === 0) {
    return null
  }

  const jobId = pendingJobs[0].id

  // Tentative atomique de claim : UPDATE ... WHERE status = 'pending'
  const { data: claimedJob, error: updateError } = await admin
    .from("async_jobs")
    .update({ status: "running", started_at: new Date().toISOString() })
    .eq("id", jobId)
    .eq("status", "pending")
    .select()
    .single()

  if (updateError || !claimedJob) {
    return null
  }

  return claimedJob as AsyncJob
}

async function runJob(job: AsyncJob) {
  const payload = job.payload as AIGenerationJobPayload | null
  if (!payload) {
    await updateJob(job.id, {
      status: "failed",
      error: "Job payload missing",
      finishedAt: new Date(),
    })
    return
  }

  // Le statut "running" a déjà été défini dans fetchNextPendingJob
  // On met juste à jour le progress initial
  await updateJob(job.id, {
    progress: 0,
  })

  let currentStatus: JobStatus = "running"
  const startTime = Date.now()

  // Créer un timeout pour le job
  const timeoutId = setTimeout(async () => {
    const elapsed = Date.now() - startTime
    console.error(`[process-ai-jobs] Job ${job.id} timeout after ${elapsed}ms`)
    try {
      await updateJob(job.id, {
        status: "failed",
        error: `Job timeout after ${JOB_TIMEOUT_MS}ms`,
        finishedAt: new Date(),
      })
    } catch (e) {
      console.error("[process-ai-jobs] Failed to update job status (timeout)", e)
    }
  }, JOB_TIMEOUT_MS)

  try {
    const result = await processAIGenerationJob(payload, async (progress) => {
      if (currentStatus !== "running") {
        return
      }
      await updateJob(job.id, { progress })
    })

    currentStatus = "succeeded"
    clearTimeout(timeoutId)

    await updateJob(job.id, {
      status: "succeeded",
      progress: 1,
      finishedAt: new Date(),
      result,
    })
  } catch (error: any) {
    currentStatus = "failed"
    clearTimeout(timeoutId)
    console.error("[process-ai-jobs] job failed", {
      jobId: job.id,
      error,
    })

    await updateJob(job.id, {
      status: "failed",
      error: error?.message || String(error),
      finishedAt: new Date(),
    })
  }
}

async function main() {
  console.log("[process-ai-jobs] Worker started")
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
    await runJob(pendingJob)
  }
}

main().catch((error) => {
  console.error("[process-ai-jobs] Fatal error", error)
  process.exit(1)
})

