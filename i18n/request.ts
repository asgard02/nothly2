import {getRequestConfig} from "next-intl/server"
import {headers} from "next/headers"

const SUPPORTED_LOCALES = ["fr", "en"] as const
const DEFAULT_LOCALE = "en" // Anglais par défaut pour les nouveaux visiteurs

type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

function resolveLocale(locale: string | undefined): SupportedLocale {
  if (locale && SUPPORTED_LOCALES.includes(locale as SupportedLocale)) {
    return locale as SupportedLocale
  }
  return DEFAULT_LOCALE
}

export default getRequestConfig(async ({locale}) => {
  // Le middleware next-intl définit la locale dans les headers
  // On peut aussi vérifier le cookie NEXT_LOCALE comme fallback
  const headersList = await headers()
  const headerLocale = headersList.get("x-next-intl-locale")
  
  // Utiliser la locale du header (définie par le middleware) ou celle passée en paramètre
  const resolvedLocale = resolveLocale(headerLocale || locale)

  const messages = await import(`../messages/${resolvedLocale}.json`).then((mod) => mod.default)

  return {
    locale: resolvedLocale,
    messages,
  }
})
