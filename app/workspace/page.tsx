"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { LibraryView } from "@/components/workspace/LibraryView"
import { SubjectView } from "@/components/workspace/SubjectView"
import Sidebar from "@/components/Sidebar"
import MainContent from "@/components/MainContent"
import type { Subject } from "@/lib/hooks/useSubjects"

export default function WorkspacePage() {
  const router = useRouter()
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null)

  const handleSelectSubject = (subject: Subject) => {
    setSelectedSubject(subject)
  }

  const handleBack = () => {
    setSelectedSubject(null)
  }

  const handleSelectDocument = (doc: any) => {
    // Ne plus rediriger vers la page du document, le PDF s'ouvrira directement depuis SubjectView
    // Cette fonction n'est plus utilisée car on ouvre directement le PDF
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <MainContent className="bg-background">
        {selectedSubject ? (
          <SubjectView
            subject={selectedSubject}
            onBack={handleBack}
            onSelectDocument={handleSelectDocument}
            onUpdate={(updatedSubject) => setSelectedSubject(updatedSubject)}
          />
        ) : (
          <LibraryView onSelectSubject={handleSelectSubject} />
        )}
      </MainContent>
    </div>
  )
}
