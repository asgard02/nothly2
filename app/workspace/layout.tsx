import Sidebar from "@/components/Sidebar"
import WorkspaceContent from "@/components/workspace/WorkspaceContent"


export default function WorkspaceLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="flex min-h-screen bg-background">
            <Sidebar />
            <WorkspaceContent>
                {children}
            </WorkspaceContent>
        </div>
    )
}
