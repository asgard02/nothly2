import { Zap } from "lucide-react"

export default function LoadingState() {
    return (
        <div className="flex h-full min-h-[50vh] w-full flex-col items-center justify-center">
            <div className="relative">
                <div className="h-24 w-24 rounded-2xl border-4 border-black bg-yellow-400 p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] animate-bounce">
                    <Zap className="h-full w-full text-black" />
                </div>
                <div className="mt-8 text-center">
                    <h2 className="text-2xl font-black uppercase text-black">Loading...</h2>
                </div>
            </div>
        </div>
    )
}
