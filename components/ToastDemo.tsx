"use client"

import { toast } from "@/components/CustomToast"
import { Button } from "@/components/ui/button"

export default function ToastDemo() {
    return (
        <div className="p-8 space-y-4 max-w-md">
            <h2 className="text-2xl font-black uppercase mb-6">Notifications Demo</h2>

            <Button
                onClick={() => toast.success("Document supprimé avec succès !")}
                className="w-full bg-[#BBF7D0] text-black border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all font-bold uppercase"
            >
                Success Toast
            </Button>

            <Button
                onClick={() => toast.error("Impossible de supprimer le document")}
                className="w-full bg-[#FECACA] text-black border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all font-bold uppercase"
            >
                Error Toast
            </Button>

            <Button
                onClick={() => toast.warning("Attention, cette action est irréversible")}
                className="w-full bg-[#FDE68A] text-black border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all font-bold uppercase"
            >
                Warning Toast
            </Button>

            <Button
                onClick={() => toast.info("Votre document a été archivé")}
                className="w-full bg-[#BAE6FD] text-black border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all font-bold uppercase"
            >
                Info Toast
            </Button>
        </div>
    )
}
