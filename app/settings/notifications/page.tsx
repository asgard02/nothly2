"use client"

import { Bell, Mail, Sparkles, MessageSquare, Megaphone, Info } from "lucide-react"

import { useTranslations } from "next-intl"

export default function NotificationsPage() {
    const t = useTranslations("Settings.Notifications")

    const sections = [
        {
            title: t("essential"),
            icon: Bell,
            items: [
                { icon: Mail, label: t("emailNotifs"), desc: t("emailNotifsDesc") },
                { icon: MessageSquare, label: t("pushNotifs"), desc: t("pushNotifsDesc") },
            ]
        },
        {
            title: t("ai"),
            icon: Sparkles,
            items: [
                { icon: Sparkles, label: t("aiSuggestions"), desc: t("aiSuggestionsDesc") },
                { icon: Mail, label: t("weeklyDigest"), desc: t("weeklyDigestDesc") },
            ]
        },
        {
            title: t("updates"),
            icon: Megaphone,
            items: [
                { icon: Sparkles, label: t("newFeatures"), desc: t("newFeaturesDesc") },
                { icon: Megaphone, label: t("marketing"), desc: t("marketingDesc") },
            ]
        },
    ]

    return (
        <div className="max-w-3xl mx-auto p-10">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-black uppercase text-foreground mb-2">{t("title")}</h1>
                <p className="text-muted-foreground font-medium">
                    {t("description")}
                </p>
            </div>

            {/* Coming soon banner */}
            <div className="mb-6 bg-accent/20 border-2 border-accent/40 rounded-xl p-5 flex items-start gap-3">
                <Bell className="h-5 w-5 text-accent-foreground mt-0.5 flex-shrink-0" />
                <div>
                    <p className="font-black text-foreground text-sm uppercase mb-1">Bientôt disponible</p>
                    <p className="text-sm text-muted-foreground font-medium">
                        Les notifications seront activées dans une prochaine mise à jour. Voici un aperçu des préférences que vous pourrez configurer.
                    </p>
                </div>
            </div>

            {/* Sections (disabled/preview) */}
            <div className="opacity-50 pointer-events-none select-none space-y-6">
                {sections.map((section) => {
                    const SectionIcon = section.icon
                    return (
                        <div key={section.title} className="bg-card border-2 border-border rounded-xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] p-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center border-2 border-border">
                                    <SectionIcon className="h-5 w-5 text-primary" />
                                </div>
                                <h2 className="text-lg font-black uppercase text-foreground">
                                    {section.title}
                                </h2>
                            </div>

                            <div className="space-y-1">
                                {section.items.map((item, idx) => {
                                    const ItemIcon = item.icon
                                    return (
                                        <div key={item.label} className={`flex items-center justify-between py-4 ${idx < section.items.length - 1 ? "border-b border-border" : ""}`}>
                                            <div className="flex items-center gap-3">
                                                <ItemIcon className="h-5 w-5 text-muted-foreground" />
                                                <div>
                                                    <p className="font-bold text-foreground text-sm">{item.label}</p>
                                                    <p className="text-xs text-muted-foreground font-medium">{item.desc}</p>
                                                </div>
                                            </div>
                                            {/* Disabled toggle */}
                                            <div className="relative w-12 h-7 rounded-full bg-muted border-2 border-border">
                                                <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md" />
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Info */}
            <div className="mt-6 bg-primary/5 border-2 border-primary/20 rounded-xl p-6">
                <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                        <p className="font-black text-foreground text-sm uppercase mb-1">{t("infoTitle")}</p>
                        <p className="text-sm text-muted-foreground font-medium">{t("infoDesc")}</p>
                    </div>
                </div>
            </div>
        </div>
    )
}
