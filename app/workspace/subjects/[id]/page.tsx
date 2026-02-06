"use client"

import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { useEffect } from "react"
import SubjectView from "@/components/workspace/SubjectView"
import { Loader2, ArrowLeft, FileQuestion } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function SingleSubjectPage({ params }: { params: { id: string } }) {
    const router = useRouter()
    const { data: subject, isLoading, isError } = useQuery({
        queryKey: ['subject', params.id],
        queryFn: async () => {
            const res = await fetch(`/api/subjects/${params.id}`)
            if (!res.ok) {
                if (res.status === 404) throw new Error('NOT_FOUND')
                throw new Error('Failed to fetch subject')
            }
            return res.json()
        },
        retry: false,
    })

    // Redirect to subjects list when subject was deleted or doesn't exist
    useEffect(() => {
        if (!isLoading && (isError || !subject)) {
            router.replace('/workspace/subjects')
        }
    }, [isLoading, isError, subject, router])

    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm font-bold text-muted-foreground">Chargement...</p>
                </div>
            </div>
        )
    }

    if (!subject) {
        return (
            <div className="flex flex-1 min-h-full items-center justify-center p-6 bg-background">
                <div className="max-w-md w-full text-center rounded-2xl border-2 border-border bg-card p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                        <FileQuestion className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h2 className="text-xl font-black uppercase text-foreground mb-2">
                        Matière introuvable
                    </h2>
                    <p className="text-muted-foreground text-sm mb-6">
                        Cette matière a peut-être été supprimée. Retour à la liste.
                    </p>
                    <Button
                        onClick={() => router.replace('/workspace/subjects')}
                        className="font-bold"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Mes matières
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <SubjectView
            subject={subject}
            onBack={() => router.push('/workspace/subjects')}
        />
    )
}
