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
    .eq("type", "document-generation")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error("[process-document-jobs] fetchNextPendingJob error", error)
    return null
  }

  return (data as AsyncJob | null) ?? null
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

  try {
    await updateJob(job.id, {
      status: currentStatus,
      startedAt: new Date(),
      progress: 0,
    })
  } catch (e) {
    console.error("[process-document-jobs] Failed to set job running", e)
    // If we can't update status, we probably shouldn't proceed as we might process it multiple times?
    // But let's verify document existence first.
  }

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

    await updateJob(job.id, {
      status: "succeeded",
      progress: 1,
      finishedAt: new Date(),
      result,
    })
  } catch (error: any) {
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
  console.error("[process-document-jobs] Fatal error", error)
  process.exit(1)
})

