import { getSupabaseAdmin } from "@/lib/db"
import { createJob, updateJob, getJob } from "@/lib/jobs"

async function main() {
  const admin = getSupabaseAdmin()

  if (!admin) {
    throw new Error("Supabase admin client is not configured. Check your environment variables.")
  }

  const { data: user, error: userError } = await admin
    .from("users")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle()

  if (userError) {
    throw userError
  }

  if (!user) {
    throw new Error("No user found in the users table. Create one first.")
  }

  console.log("Using user id:", user.id)

  const job = await createJob({
    userId: user.id,
    type: "test-job",
    payload: { example: true },
  })

  console.log("Created job:", job.id)

  await updateJob(job.id, {
    status: "running",
    startedAt: new Date(),
    progress: 0.1,
  })

  console.log("Marked job as running at 10%")

  await updateJob(job.id, {
    progress: 0.6,
  })

  console.log("Updated job progress to 60%")

  await updateJob(job.id, {
    status: "succeeded",
    progress: 1,
    finishedAt: new Date(),
    result: { message: "Test completed successfully" },
  })

  console.log("Marked job as succeeded")

  const finalJob = await getJob(job.id)
  console.log("Final job state:", finalJob)
}

main().catch((error) => {
  console.error("[test-async-job] Error:", error)
  process.exit(1)
})

