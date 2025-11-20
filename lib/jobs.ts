import type { SupabaseClient } from "@supabase/supabase-js"

import { getSupabaseAdmin } from "@/lib/db"

export type JobStatus = "pending" | "running" | "succeeded" | "failed" | "cancelled"

export interface AsyncJob {
  id: string
  user_id: string
  type: string
  status: JobStatus
  progress: number | null
  payload: Record<string, unknown> | null
  result: Record<string, unknown> | null
  error: string | null
  created_at: string
  updated_at: string
  started_at: string | null
  finished_at: string | null
}

const TABLE = "async_jobs"

type AnySupabaseClient = SupabaseClient<any, any, any>

function resolveClient(explicit?: AnySupabaseClient | null) {
  if (explicit) {
    return explicit
  }
  const admin = getSupabaseAdmin()
  if (!admin) {
    throw new Error("Supabase admin client is not configured")
  }
  return admin
}

export interface CreateJobOptions {
  userId: string
  type: string
  payload?: Record<string, unknown> | null
  initialStatus?: JobStatus
  client?: AnySupabaseClient | null
}

export async function createJob({
  userId,
  type,
  payload = null,
  initialStatus = "pending",
  client,
}: CreateJobOptions): Promise<AsyncJob> {
  const db = resolveClient(client)

  const { data, error } = await db
    .from(TABLE)
    .insert({
      user_id: userId,
      type,
      payload,
      status: initialStatus,
    })
    .select()
    .single()

  if (error || !data) {
    throw new Error(error?.message || "Unable to create async job")
  }

  return data as AsyncJob
}

export interface UpdateJobOptions {
  status?: JobStatus
  progress?: number | null
  result?: Record<string, unknown> | null
  error?: string | null
  startedAt?: Date | string | null
  finishedAt?: Date | string | null
}

export async function updateJob(jobId: string, updates: UpdateJobOptions): Promise<AsyncJob> {
  const admin = resolveClient()

  const payload: Record<string, unknown> = {}

  if (updates.status) {
    payload.status = updates.status
  }

  if (typeof updates.progress === "number") {
    payload.progress = Math.min(Math.max(updates.progress, 0), 1)
  } else if (updates.progress === null) {
    payload.progress = null
  }

  if (updates.result !== undefined) {
    payload.result = updates.result
  }

  if (updates.error !== undefined) {
    payload.error = updates.error
  }

  if (updates.startedAt !== undefined) {
    payload.started_at = updates.startedAt
      ? new Date(updates.startedAt).toISOString()
      : null
  }

  if (updates.finishedAt !== undefined) {
    payload.finished_at = updates.finishedAt
      ? new Date(updates.finishedAt).toISOString()
      : null
  }

  if (Object.keys(payload).length === 0) {
    const job = await getJob(jobId)
    if (!job) {
      throw new Error("Job not found")
    }
    return job
  }

  const { data, error } = await admin
    .from(TABLE)
    .update(payload)
    .eq("id", jobId)
    .select()
    .maybeSingle()

  if (error) {
    throw new Error(error.message || "Unable to update async job")
  }

  if (!data) {
    throw new Error(`Job ${jobId} not found`)
  }

  return data as AsyncJob
}

export async function getJob(jobId: string): Promise<AsyncJob | null> {
  const admin = resolveClient()

  const { data, error } = await admin.from(TABLE).select().eq("id", jobId).single()

  if (error || !data) {
    return null
  }

  return data as AsyncJob
}

