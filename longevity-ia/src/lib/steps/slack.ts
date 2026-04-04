/**
 * Steps de integración con Slack.
 * Envía mensajes, alertas formateadas y archivos.
 */

const ALERT_COLORS: Record<string, string> = {
  info: '#3b82f6',
  warning: '#f59e0b',
  danger: '#ef4444',
  critical: '#dc2626',
}

export interface SlackConfig {
  token: string
  defaultChannel?: string
}

function getSlackConfig(): SlackConfig | null {
  const token = process.env.SLACK_BOT_TOKEN
  if (!token) return null
  return { token, defaultChannel: process.env.SLACK_DEFAULT_CHANNEL }
}

export async function sendSlackMessage(
  channel: string,
  message: string,
  alertLevel?: string,
): Promise<{ sent: boolean; error?: string }> {
  const config = getSlackConfig()
  if (!config) return { sent: false, error: 'Slack no configurado (SLACK_BOT_TOKEN)' }

  const payload: Record<string, unknown> = { channel }

  if (alertLevel && ALERT_COLORS[alertLevel]) {
    payload.attachments = [{
      color: ALERT_COLORS[alertLevel],
      text: message,
      footer: 'Longevity IA',
      ts: Math.floor(Date.now() / 1000),
    }]
  } else {
    payload.text = message
  }

  const res = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const data = await res.json() as { ok: boolean; error?: string }
  if (!data.ok) return { sent: false, error: `Slack: ${data.error}` }
  return { sent: true }
}

export async function uploadToSlack(
  channel: string,
  fileBuffer: Buffer,
  filename: string,
  title?: string,
): Promise<{ sent: boolean; error?: string }> {
  const config = getSlackConfig()
  if (!config) return { sent: false, error: 'Slack no configurado' }

  const form = new FormData()
  form.append('channels', channel)
  form.append('file', new Blob([new Uint8Array(fileBuffer)]), filename)
  if (title) form.append('title', title)

  const res = await fetch('https://slack.com/api/files.upload', {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.token}` },
    body: form,
  })

  const data = await res.json() as { ok: boolean; error?: string }
  if (!data.ok) return { sent: false, error: `Slack: ${data.error}` }
  return { sent: true }
}

export function isSlackConfigured(): boolean {
  return !!process.env.SLACK_BOT_TOKEN
}
