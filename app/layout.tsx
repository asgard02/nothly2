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

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Nothly - Notes intelligentes avec IA",
  description: "Créez, éditez et transformez vos notes en fiches de révision et quiz grâce à l'IA",
  icons: {
    icon: [
      { url: "/logo-icon.png", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
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
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
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
    <html lang={locale} suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen bg-background text-foreground transition-colors`}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <SidebarProvider>
              <ReactQueryProvider>
                {children}
                <Toaster position="bottom-right" theme="system" closeButton richColors />
              </ReactQueryProvider>
            </SidebarProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}

