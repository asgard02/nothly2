import { NextResponse } from "next/server"

// Endpoint de monitoring pour surveiller les requêtes en temps réel
export async function GET() {
  const stats = {
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    env: {
      nodeEnv: process.env.NODE_ENV,
    },
  }

  return NextResponse.json(stats, {
    headers: {
      "Cache-Control": "no-store",
    },
  })
}


