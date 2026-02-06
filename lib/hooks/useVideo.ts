// Stub implementation for video hooks (feature is gitignored but needed for build)
// This file provides minimal implementations to prevent build errors

export function useCreateVideo() {
  return {
    createVideo: async (type: string, sourceId: string, title: string): Promise<string | null> => null,
    isCreating: false,
    error: null as string | null,
  }
}

export function useVideoList() {
  return {
    videos: [] as Array<{
      id: string
      title: string
      status: string
      progress?: number
      slide_count?: number
      duration_seconds?: number
      created_at?: string
    }>,
    quota: null as { remaining: number; plan: string } | null,
    refresh: () => {},
    deleteVideo: async () => {},
  }
}

export function useVideo(
  videoId: string | null,
  options?: {
    onComplete?: (video: any) => void
    onError?: (error: string) => void
  }
) {
  return {
    video: null as any,
    isProcessing: false,
    isComplete: false,
    isFailed: false,
  }
}

export function useVideoQuota() {
  return {
    quota: null as { remaining: number; plan: string } | null,
    refresh: () => {},
  }
}
