"use client"

import { toast } from "@/components/CustomToast"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"

export default function ToastTestPage() {
    const router = useRouter()

    return (
        <div className="min-h-screen bg-[#FDF6E3] p-8">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-black hover:text-gray-700 font-bold mb-4"
                    >
                        <ArrowLeft className="h-5 w-5" />
                        Retour
                    </button>
                    <h1 className="text-4xl font-black uppercase mb-2">Test des Notifications</h1>
                    <p className="text-gray-700 font-medium">Cliquez sur les boutons pour voir les différents types de notifications</p>
                </div>

                {/* Test Buttons */}
                <div className="bg-white border-2 border-black rounded-xl p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                    <div className="space-y-4">
                        <div>
                            <h2 className="text-sm font-black uppercase text-gray-500 mb-2">Succès</h2>
                            <Button
                                onClick={() => toast.success("Document supprimé avec succès !")}
                                className="w-full bg-[#BBF7D0] text-black border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all font-bold uppercase h-12"
                            >
                                Afficher notification de succès
                            </Button>
                        </div>

                        <div>
                            <h2 className="text-sm font-black uppercase text-gray-500 mb-2">Erreur</h2>
                            <Button
                                onClick={() => toast.error("Impossible de supprimer le document")}
                                className="w-full bg-[#FECACA] text-black border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all font-bold uppercase h-12"
                            >
                                Afficher notification d'erreur
                            </Button>
                        </div>

                        <div>
                            <h2 className="text-sm font-black uppercase text-gray-500 mb-2">Attention</h2>
                            <Button
                                onClick={() => toast.warning("Attention, cette action est irréversible")}
                                className="w-full bg-[#FDE68A] text-black border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all font-bold uppercase h-12"
                            >
                                Afficher notification d'attention
                            </Button>
                        </div>

                        <div>
                            <h2 className="text-sm font-black uppercase text-gray-500 mb-2">Information</h2>
                            <Button
                                onClick={() => toast.info("Votre document a été archivé")}
                                className="w-full bg-[#BAE6FD] text-black border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all font-bold uppercase h-12"
                            >
                                Afficher notification d'info
                            </Button>
                        </div>

                        <div className="pt-4 border-t-2 border-black">
                            <h2 className="text-sm font-black uppercase text-gray-500 mb-2">Test Multiple</h2>
                            <Button
                                onClick={() => {
                                    toast.success("Première notification")
                                    setTimeout(() => toast.info("Deuxième notification"), 500)
                                    setTimeout(() => toast.warning("Troisième notification"), 1000)
                                    setTimeout(() => toast.error("Quatrième notification"), 1500)
                                }}
                                className="w-full bg-[#8B5CF6] text-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all font-bold uppercase h-12"
                            >
                                Afficher toutes les notifications
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Info Box */}
                <div className="mt-8 bg-[#BAE6FD] border-2 border-black rounded-xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <h3 className="font-black uppercase mb-2">ℹ️ Information</h3>
                    <p className="text-sm font-medium text-gray-700">
                        Les notifications apparaîtront en bas à droite de l'écran avec le nouveau style Neo-Brutalism.
                        Elles disparaîtront automatiquement après quelques secondes.
                    </p>
                </div>
            </div>
        </div>
    )
}
