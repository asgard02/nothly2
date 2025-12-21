"use client"

import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import SubjectView from "@/components/workspace/SubjectView"
import { Loader2 } from "lucide-react"

export default function SingleSubjectPage({ params }: { params: { id: string } }) {
    const router = useRouter()
    const { data: subject, isLoading } = useQuery({
        queryKey: ['subject', params.id],
        queryFn: async () => {
            const res = await fetch(`/api/subjects/${params.id}`)
            if (!res.ok) throw new Error('Failed to fetch subject')
            return res.json()
        }
    })

    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-black" />
            </div>
        )
    }

    if (!subject) return <div>Subject not found</div>

    return (
        <SubjectView
            subject={subject}
            onBack={() => router.push('/workspace/subjects')}
        />
    )
}
