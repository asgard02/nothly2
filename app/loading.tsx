"use client"

import { motion } from "framer-motion"
import { Zap } from "lucide-react"

export default function Loading() {
    return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-white overflow-hidden relative">
            {/* Background Gradients with Smooth Blur */}
            <div className="absolute inset-0 w-full h-full pointer-events-none opacity-60">
                <motion.div
                    animate={{ scale: [1, 1.2, 1], x: [0, 50, 0], opacity: [0.5, 0.8, 0.5] }}
                    transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute -top-[20%] -left-[10%] w-[60vh] h-[60vh] bg-[#FBCFE8] rounded-full blur-[100px]"
                />
                <motion.div
                    animate={{ scale: [1, 1.1, 1], x: [0, -30, 0], opacity: [0.5, 0.7, 0.5] }}
                    transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                    className="absolute top-[10%] -right-[10%] w-[50vh] h-[50vh] bg-[#BAE6FD] rounded-full blur-[100px]"
                />
                <motion.div
                    animate={{ scale: [1, 1.3, 1], y: [0, -40, 0], opacity: [0.4, 0.6, 0.4] }}
                    transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                    className="absolute -bottom-[20%] left-[20%] w-[55vh] h-[55vh] bg-[#BBF7D0] rounded-full blur-[100px]"
                />
                <motion.div
                    animate={{ scale: [1, 1.2, 1], y: [0, 30, 0], opacity: [0.4, 0.7, 0.4] }}
                    transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                    className="absolute bottom-[20%] -right-[20%] w-[45vh] h-[45vh] bg-[#FDE68A] rounded-full blur-[80px]"
                />
            </div>

            {/* Main Content */}
            <div className="relative z-10 flex flex-col items-center">
                <motion.div
                    animate={{
                        y: [-10, 10, -10],
                    }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                >
                    <div className="h-24 w-24 rounded-3xl border-4 border-black bg-white p-5 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center relative">
                        <Zap className="h-10 w-10 text-black fill-yellow-400" strokeWidth={3} />
                    </div>
                </motion.div>

                <div className="mt-12 flex flex-col items-center gap-3">
                    <h2 className="text-2xl font-black uppercase tracking-widest text-black">
                        Loading
                    </h2>
                    <div className="flex gap-2">
                        {[0, 1, 2].map((i) => (
                            <motion.div
                                key={i}
                                animate={{
                                    scale: [1, 1.5, 1],
                                    opacity: [0.3, 1, 0.3]
                                }}
                                transition={{
                                    duration: 1,
                                    repeat: Infinity,
                                    delay: i * 0.2,
                                    ease: "easeInOut"
                                }}
                                className="h-3 w-3 bg-black rounded-full"
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
