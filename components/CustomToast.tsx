"use client"

import { Check, X, AlertCircle, Info } from "lucide-react"
import { toast as sonnerToast } from "sonner"

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface CustomToastProps {
    type: ToastType
    message: string
}

const CustomToastInner = ({ type, message }: CustomToastProps) => {
    const config = {
        success: {
            icon: Check,
            bgColor: "bg-[#BBF7D0]",
            iconBg: "bg-card",
            title: "Succès !",
        },
        error: {
            icon: X,
            bgColor: "bg-[#FECACA] dark:bg-red-950/30",
            iconBg: "bg-card",
            title: "Erreur",
        },
        warning: {
            icon: AlertCircle,
            bgColor: "bg-[#FDE68A]",
            iconBg: "bg-card",
            title: "Attention",
        },
        info: {
            icon: Info,
            bgColor: "bg-[#BAE6FD]",
            iconBg: "bg-card",
            title: "Info",
        },
    }

    const { icon: Icon, bgColor, iconBg, title } = config[type]

    return (
        <div className={`flex items-center gap-4 ${bgColor} border-2 border-border p-4 rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] w-full max-w-sm`}>
            <div className={`h-10 w-10 ${iconBg} border-2 border-border rounded-lg flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] flex-shrink-0`}>
                <Icon className="h-6 w-6 text-foreground" strokeWidth={3} />
            </div>
            <div className="flex-1 min-w-0">
                <h4 className="font-black text-foreground uppercase text-sm leading-tight">{title}</h4>
                <p className="font-bold text-muted-foreground text-xs mt-0.5 line-clamp-2">{message}</p>
            </div>
        </div>
    )
}

export const toast = {
    success: (message: string) => {
        return sonnerToast.custom(() => <CustomToastInner type="success" message={message} />, {
            duration: 4000,
        })
    },
    error: (message: string) => {
        return sonnerToast.custom(() => <CustomToastInner type="error" message={message} />, {
            duration: 5000,
        })
    },
    warning: (message: string) => {
        return sonnerToast.custom(() => <CustomToastInner type="warning" message={message} />, {
            duration: 4000,
        })
    },
    info: (message: string) => {
        return sonnerToast.custom(() => <CustomToastInner type="info" message={message} />, {
            duration: 4000,
        })
    },
}
