import nodemailer, { type Transporter } from "nodemailer"

type Nullable<T> = T | null

let cachedTransporter: Nullable<Transporter> | undefined

function createTransporter(): Nullable<Transporter> {
  const host = process.env.SMTP_HOST
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (!host || !port || !user || !pass) {
    if (cachedTransporter !== undefined) {
      return cachedTransporter
    }

    console.warn(
      "[Email] SMTP configuration missing. Set SMTP_HOST, SMTP_PORT, SMTP_USER and SMTP_PASS to enable email notifications."
    )
    cachedTransporter = null
    return cachedTransporter
  }

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  })

  return cachedTransporter
}

function getTransporter(): Nullable<Transporter> {
  if (cachedTransporter !== undefined) {
    return cachedTransporter
  }

  return createTransporter()
}

export interface DeckReadyPayload {
  to: string
  documentTitle: string
  documentId: string
  totalSections: number
  totalQuizzes: number
  dashboardUrl?: string
}

export async function sendDeckReadyEmail(payload: DeckReadyPayload) {
  const transporter = getTransporter()

  if (!transporter) {
    console.info(
      "[Email] Skipping deck ready email because SMTP is not configured.",
      payload
    )
    return
  }

  const from = process.env.EMAIL_FROM

  if (!from) {
    console.warn("[Email] EMAIL_FROM is not defined. Using SMTP_USER instead.")
  }

  const subject = `Ton deck "${payload.documentTitle}" est prêt ✨`

  const text = [
    `Hello !`,
    "",
    `Ton deck "${payload.documentTitle}" est maintenant disponible.`,
    `• Sections générées : ${payload.totalSections}`,
    `• Quiz générés : ${payload.totalQuizzes}`,
    "",
    payload.dashboardUrl
      ? `Accède-y directement : ${payload.dashboardUrl}`
      : "Connecte-toi pour le consulter.",
    "",
    "À très vite 👋",
  ].join("\n")

  const html = `
    <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.5;">
      <h2 style="margin: 0 0 16px;">Ton deck <em>${payload.documentTitle}</em> est prêt ✨</h2>
      <p>Bonne nouvelle ! Nous venons de terminer la génération de ton deck.</p>
      <ul style="padding-left: 20px; margin: 16px 0;">
        <li><strong>Sections générées :</strong> ${payload.totalSections}</li>
        <li><strong>Quiz générés :</strong> ${payload.totalQuizzes}</li>
      </ul>
      ${
        payload.dashboardUrl
          ? `<p style="margin: 16px 0;"><a href="${payload.dashboardUrl}" style="display: inline-block; padding: 10px 16px; background-color: #4338ca; color: #ffffff; border-radius: 8px; text-decoration: none;">Voir le deck</a></p>`
          : ""
      }
      <p style="margin-top: 24px;">Merci d'utiliser Nothly 💜</p>
    </div>
  `

  await transporter.sendMail({
    from: from || process.env.SMTP_USER,
    to: payload.to,
    subject,
    text,
    html,
  })

  console.info("[Email] Deck ready email sent", {
    to: payload.to,
    documentId: payload.documentId,
  })
}

export function resetEmailTransporterCache() {
  cachedTransporter = undefined
}


