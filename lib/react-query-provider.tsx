"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState, useEffect } from "react"

export default function ReactQueryProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1 * 60 * 1000, // 1 minute
            gcTime: 5 * 60 * 1000, // 5 minutes (anciennement cacheTime)
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  )

  // ⚡ Persistance React Query dans localStorage pour permettre l'ouverture offline
  useEffect(() => {
    if (typeof window === "undefined") return

    // Import dynamique pour éviter les erreurs si les packages ne sont pas installés
    Promise.all([
      import("@tanstack/react-query-persist-client").catch(() => null),
      import("@tanstack/query-sync-storage-persister").catch(() => null),
    ]).then(([persistClientModule, persisterModule]) => {
      if (!persistClientModule || !persisterModule) {
        // Packages non installés - continuer sans persistance
        return
      }

      const { persistQueryClient } = persistClientModule
      const { createSyncStoragePersister } = persisterModule

      const persister = createSyncStoragePersister({
        storage: window.localStorage,
        key: "NOTLHY_QUERY_CACHE",
      })

      persistQueryClient({
        queryClient,
        persister,
        maxAge: 24 * 60 * 60 * 1000, // 24 heures
        dehydrateOptions: {
          shouldDehydrateQuery: (query) => {
            // Ne persister que les queries réussies et les notes
            return (
              query.state.status === "success" &&
              (query.queryKey[0] === "notes" || query.queryKey[0] === "note")
            )
          },
        },
      })
    })
  }, [queryClient])

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

