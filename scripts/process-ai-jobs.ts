import { setTimeout as sleep } from "node:timers/promises"

import { AI_GENERATION_JOB_TYPE, processAIGenerationJob, type AIGenerationJobPayload } from "@/lib/ai/jobs"
import { getSupabaseAdmin } from "@/lib/db"
import { getJob, updateJob, type AsyncJob, type JobStatus } from "@/lib/jobs"

const BASE_POLL_INTERVAL_MS = Number(process.env.JOB_POLL_INTERVAL_MS || 2000)
const MAX_POLL_INTERVAL_MS = 30000 // 30 secondes max
const BACKOFF_MULTIPLIER = 1.5

async function fetchNextPendingJob(): Promise<AsyncJob | null> {
  const admin = getSupabaseAdmin()
  if (!admin) {
    throw new Error("Supabase admin client is not configured")
  }

  const { data, error } = await admin
    .from("async_jobs")
    .select("*")
    .eq("status", "pending")
    .eq("type", AI_GENERATION_JOB_TYPE)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error("[process-ai-jobs] fetchNextPendingJob error", error)
    // @ts-ignore - Supabase error typing can be loose
    if (error.message === 'Internal server error.' || error.code === '500') {
       console.error("[process-ai-jobs] 🚨 CRITICAL: Supabase returned 'Internal server error'. Your project might be PAUSED or the database is down. Check: https://supabase.com/dashboard/project/_")
    }
    return null
  }

  return (data as AsyncJob | null) ?? null
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

  await updateJob(job.id, {
    status: "running",
    startedAt: new Date(),
    progress: 0,
  })

  let currentStatus: JobStatus = "running"

  try {
    const result = await processAIGenerationJob(payload, async (progress) => {
      if (currentStatus !== "running") {
        return
      }
      await updateJob(job.id, { progress })
    })

    currentStatus = "succeeded"

    await updateJob(job.id, {
      status: "succeeded",
      progress: 1,
      finishedAt: new Date(),
      result,
    })
  } catch (error: any) {
    currentStatus = "failed"
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

    const freshJob = await getJob(pendingJob.id)
    if (!freshJob || freshJob.status !== "pending") {
      continue
    }

    await runJob(freshJob)
  }
}

main().catch((error) => {
  console.error("[process-ai-jobs] Fatal error", error)
  process.exit(1)
})

