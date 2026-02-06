import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import ReactQueryProvider from "@/lib/react-query-provider"
import { ThemeProvider } from "@/components/ThemeProvider"
import { NextIntlClientProvider } from "next-intl"
import { getLocale, getMessages } from "next-intl/server"
import { notFound } from "next/navigation"
import { SidebarProvider } from "@/components/providers/SidebarProvider"
import { Toaster } from "sonner"
import { AntigravityBackground } from "@/components/ui/antigravity-background"
import { TutorialOverlay } from "@/components/onboarding/TutorialOverlay"
import { TutorialProvider } from "@/components/providers/TutorialProvider"
import { SearchCommandWrapper } from "@/components/SearchCommandWrapper"


const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Nothly - Notes intelligentes avec IA",
  description: "Créez, éditez et transformez vos notes en fiches de révision et quiz grâce à l'IA",
  manifest: "/manifest.json",
  openGraph: {
    title: "Nothly - Notes intelligentes avec IA",
    description: "Créez, éditez et transformez vos notes en fiches de révision et quiz grâce à l'IA",
    images: ["/logo-icon.png"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Nothly - Notes intelligentes avec IA",
    description: "Créez, éditez et transformez vos notes en fiches de révision et quiz grâce à l'IA",
    images: ["/logo-icon.png"],
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#020617" },
    { media: "(prefers-color-scheme: dark)", color: "#020617" },
  ],
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const locale = await getLocale()

  const messages = await getMessages().catch(() => null)
  if (!messages) {
    notFound()
  }

  return (
      <html lang={locale} suppressHydrationWarning className="bg-background">
      <body className={`${inter.className} min-h-screen bg-background text-foreground antialiased selection:bg-primary/30 selection:text-primary-foreground`}>
        <AntigravityBackground />
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
            <SidebarProvider>
              <ReactQueryProvider>
                <TutorialProvider>
                  {children}
                  <TutorialOverlay />
                  <SearchCommandWrapper />
                </TutorialProvider>
                <Toaster position="bottom-right" closeButton richColors />
              </ReactQueryProvider>
            </SidebarProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}

