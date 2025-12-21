import Sidebar from "@/components/Sidebar"
import WorkspaceContent from "@/components/workspace/WorkspaceContent"
import { TutorialProvider } from "@/components/providers/TutorialProvider"
import { TutorialOverlay } from "@/components/onboarding/TutorialOverlay"

export default function WorkspaceLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <TutorialProvider>
            <div className="flex min-h-screen bg-[#FDF6E3]">
                <Sidebar />
                <WorkspaceContent>
                    {children}
                </WorkspaceContent>
                <TutorialOverlay />
            </div>
        </TutorialProvider>
    )
}
