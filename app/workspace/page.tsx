"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { LibraryView } from "@/components/workspace/LibraryView"
import { CollectionView } from "@/components/workspace/CollectionView"
import Sidebar from "@/components/Sidebar"
import MainContent from "@/components/MainContent"
import type { Collection } from "@/lib/hooks/useCollections"

export default function WorkspacePage() {
  const router = useRouter()
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null)

  const handleSelectCollection = (collection: Collection) => {
    setSelectedCollection(collection)
  }

  const handleBack = () => {
    setSelectedCollection(null)
  }

  const handleSelectDocument = (doc: any) => {
    // Ne plus rediriger vers la page du document, le PDF s'ouvrira directement depuis CollectionView
    // Cette fonction n'est plus utilisée car on ouvre directement le PDF
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <MainContent className="bg-background">
        {selectedCollection ? (
          <CollectionView
            collection={selectedCollection}
            onBack={handleBack}
            onSelectDocument={handleSelectDocument}
            onUpdate={(updatedCollection) => setSelectedCollection(updatedCollection)}
          />
        ) : (
          <LibraryView onSelectCollection={handleSelectCollection} />
        )}
      </MainContent>
    </div>
  )
}
