import { setTimeout as sleep } from "node:timers/promises"

import { getSupabaseAdmin } from "@/lib/db"
import { getJob, updateJob, type AsyncJob, type JobStatus } from "@/lib/jobs"
import {
  processCollectionGenerationJob,
  type CollectionGenerationJobPayload,
} from "@/lib/collections/processor"

const POLL_INTERVAL_MS = Number(process.env.JOB_POLL_INTERVAL_MS || 2000)

async function fetchNextPendingJob(): Promise<AsyncJob | null> {
  const admin = getSupabaseAdmin()
  if (!admin) {
    throw new Error("Supabase admin client is not configured")
  }

  const { data, error } = await admin
    .from("async_jobs")
    .select("*")
    .eq("status", "pending")
    .eq("type", "collection-generation")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error("[process-collection-jobs] fetchNextPendingJob error", error)
    return null
  }

  return (data as AsyncJob | null) ?? null
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

  await updateJob(job.id, {
    status: currentStatus,
    startedAt: new Date(),
    progress: 0,
  })

  try {
    const result = await processCollectionGenerationJob(payload, async (progress) => {
      if (progress >= 1) {
        return
      }
      await updateJob(job.id, { progress })
    })

    await updateJob(job.id, {
      status: "succeeded",
      progress: 1,
      finishedAt: new Date(),
      result,
    })
  } catch (error: any) {
    console.error("[process-collection-jobs] job failed", {
      jobId: job.id,
      error,
    })

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
  }
}

async function main() {
  console.log("[process-collection-jobs] Worker started")

  while (true) {
    const pendingJob = await fetchNextPendingJob()

    if (!pendingJob) {
      await sleep(POLL_INTERVAL_MS)
      continue
    }

    const freshJob = await getJob(pendingJob.id)
    if (!freshJob || freshJob.status !== "pending") {
      continue
    }

    await runJob(freshJob)
  }
}

main().catch((error) => {
  console.error("[process-collection-jobs] Fatal error", error)
  process.exit(1)
})

