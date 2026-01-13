import { setTimeout as sleep } from "node:timers/promises"

import { getSupabaseAdmin } from "@/lib/db"
import { getJob, updateJob, type AsyncJob, type JobStatus } from "@/lib/jobs"
import {
  processCollectionGenerationJob,
  type CollectionGenerationJobPayload,
} from "@/lib/collections/processor"

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
    .eq("type", "collection-generation")
    .order("created_at", { ascending: true })
    .limit(1)

  if (selectError || !pendingJobs || pendingJobs.length === 0) {
    if (selectError) {
      console.error("[process-collection-jobs] fetchNextPendingJob error", selectError)
    }
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
  const payload = job.payload as CollectionGenerationJobPayload | null
  if (!payload) {
    await updateJob(job.id, {
      status: "failed",
      error: "Job payload missing",
      finishedAt: new Date(),
    })
    return
  }

  let currentStatus: JobStatus = "running"
  const startTime = Date.now()

  // Le statut "running" a déjà été défini dans fetchNextPendingJob
  // On met juste à jour le progress initial
  await updateJob(job.id, {
    progress: 0,
  })

  // Créer un timeout pour le job
  const timeoutId = setTimeout(async () => {
    const elapsed = Date.now() - startTime
    console.error(`[process-collection-jobs] Job ${job.id} timeout after ${elapsed}ms`)
    try {
      await updateJob(job.id, {
        status: "failed",
        error: `Job timeout after ${JOB_TIMEOUT_MS}ms`,
        finishedAt: new Date(),
      })
    } catch (e) {
      console.error("[process-collection-jobs] Failed to update job status (timeout)", e)
    }
  }, JOB_TIMEOUT_MS)

  try {
    const result = await processCollectionGenerationJob(payload, async (progress) => {
      if (progress >= 1) {
        return
      }
      await updateJob(job.id, { progress })
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
    console.error("[process-collection-jobs] job failed", {
      jobId: job.id,
      error,
    })

    try {
      const admin = getSupabaseAdmin()
      if (admin && payload.collectionId) {
        await admin
          .from("study_collections")
          .update({
            status: "failed",
            updated_at: new Date().toISOString(),
          })
          .eq("id", payload.collectionId)
      }

      await updateJob(job.id, {
        status: "failed",
        error: error?.message || String(error),
        finishedAt: new Date(),
      })
    } catch (updateError: any) {
      console.error("[process-collection-jobs] failed to update job status", {
        jobId: job.id,
        error: updateError,
      })
      // Continue execution even if update fails
    }
  }
}

async function main() {
  console.log("[process-collection-jobs] Worker started")
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
  console.error("[process-collection-jobs] Fatal error", error)
  process.exit(1)
})

