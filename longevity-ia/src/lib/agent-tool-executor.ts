/**
 * Ejecutor de tools del agente.
 * Recibe un tool_use block de Claude, ejecuta el query step correspondiente,
 * y retorna el resultado como string para tool_result.
 */

import {
  resolveClinicaId,
  resolveClinicMedicos,
  resolveClinicPatientIds,
  queryMedicoSessions,
  queryActiveMedicos,
  queryCriticalPatients,
  queryBiomarkerTrends,
  queryPatientsByFilters,
  queryClinicActivity,
  queryDoctorPerformance,
} from '@/lib/steps'
import type { ActivityMetric } from '@/lib/steps'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

// ── Types ───────────────────────────────────────────────────────────

interface ToolContext {
  userId: string
  role: 'medico' | 'clinica'
  clinicaId: string | null
}

interface ToolResult {
  success: boolean
  data?: unknown
  error?: string
}

// ── Helper: find medico by name ─────────────────────────────────────

async function findMedicoByName(clinicaId: string, name: string): Promise<string | null> {
  const medicos = await resolveClinicMedicos(clinicaId)
  const normalized = name.toLowerCase().trim()
  const match = medicos.find(m =>
    m.full_name.toLowerCase().includes(normalized)
  )
  return match?.user_id ?? null
}

// ── Helper: find patient by name ────────────────────────────────────

async function findPatientByName(name: string, medicoUserId?: string): Promise<string | null> {
  const admin = getSupabaseAdmin()
  // Escape SQL wildcards to prevent injection via % or _
  const normalized = name.toLowerCase().trim().replace(/[%_\\]/g, '\\$&')

  let query = admin.from('patients').select('id, name').ilike('name', `%${normalized}%`).limit(1)
  if (medicoUserId) {
    query = query.eq('user_id', medicoUserId)
  }

  const { data } = await query
  return data?.[0]?.id ?? null
}

// ── Main executor ───────────────────────────────────────────────────

export async function executeAgentTool(
  toolName: string,
  toolInput: Record<string, unknown>,
  context: ToolContext,
): Promise<ToolResult> {
  try {
    switch (toolName) {

      // ── Critical patients query ─────────────────────────────────
      case 'query_patients': {
        if (!context.clinicaId) return { success: false, error: 'No se pudo resolver la clínica del usuario' }

        const criteria = toolInput.criteria as 'danger_biomarkers' | 'low_system_score' | 'critical_alerts' | 'no_recent_analysis'
        const result = await queryCriticalPatients(context.clinicaId, criteria, {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          system: toolInput.system as any,
          threshold: toolInput.threshold as number | undefined,
          medico_user_id: toolInput.medico_id as string | undefined,
        })

        return { success: true, data: { total: result.length, patients: result } }
      }

      // ── Medico sessions ─────────────────────────────────────────
      case 'query_medico_sessions': {
        if (!context.clinicaId) return { success: false, error: 'No se pudo resolver la clínica' }

        let medicoId = toolInput.medico_id as string | undefined
        if (!medicoId && toolInput.medico_name) {
          medicoId = await findMedicoByName(context.clinicaId, toolInput.medico_name as string) ?? undefined
          if (!medicoId) return { success: false, error: `No se encontró médico con nombre "${toolInput.medico_name}"` }
        }
        if (!medicoId) return { success: false, error: 'Se requiere medico_id o medico_name' }

        const period = toolInput.period as 'today' | 'week' | 'month' | 'quarter'
        const sessions = await queryMedicoSessions(medicoId, period)

        // Enriquecer con nombre del médico
        const medicos = await resolveClinicMedicos(context.clinicaId)
        const medico = medicos.find(m => m.user_id === medicoId)

        return {
          success: true,
          data: {
            medico_name: medico?.full_name ?? 'Desconocido',
            medico_specialty: medico?.specialty ?? '',
            period,
            ...sessions,
          },
        }
      }

      // ── Active medicos ──────────────────────────────────────────
      case 'query_active_medicos': {
        if (!context.clinicaId) return { success: false, error: 'No se pudo resolver la clínica' }

        const period = toolInput.period as 'today' | 'week' | 'month' | 'quarter'
        const result = await queryActiveMedicos(context.clinicaId, period)

        return { success: true, data: result }
      }

      // ── Clinic activity ─────────────────────────────────────────
      case 'query_clinic_activity': {
        if (!context.clinicaId) return { success: false, error: 'No se pudo resolver la clínica' }

        const period = toolInput.period as 'today' | 'week' | 'month' | 'quarter'
        const ALL_METRICS: ActivityMetric[] = [
          'analyses_count', 'consultations_count', 'patients_created',
          'voice_notes_count', 'clinical_notes_count', 'alerts_generated', 'alerts_resolved',
        ]
        const metrics = (toolInput.metrics as ActivityMetric[] | undefined) ?? ALL_METRICS
        const groupBy = (toolInput.group_by as 'medico' | 'day' | 'none' | undefined) ?? 'none'

        const result = await queryClinicActivity(context.clinicaId, period, metrics, groupBy)

        return { success: true, data: result }
      }

      // ── Doctor performance ──────────────────────────────────────
      case 'query_doctor_performance': {
        if (!context.clinicaId) return { success: false, error: 'No se pudo resolver la clínica' }

        const period = toolInput.period as 'today' | 'week' | 'month' | 'quarter'
        const result = await queryDoctorPerformance(context.clinicaId, period)

        return { success: true, data: { total_medicos: result.length, medicos: result } }
      }

      // ── Biomarker trends ────────────────────────────────────────
      case 'query_biomarker_trends': {
        let patientId = toolInput.patient_id as string | undefined
        if (!patientId && toolInput.patient_name) {
          const medicoId = context.role === 'medico' ? context.userId : undefined
          patientId = await findPatientByName(toolInput.patient_name as string, medicoId) ?? undefined
          if (!patientId) return { success: false, error: `No se encontró paciente con nombre "${toolInput.patient_name}"` }
        }
        if (!patientId) return { success: false, error: 'Se requiere patient_id o patient_name' }

        // Verificar que el paciente pertenece al médico o a la clínica
        if (context.clinicaId) {
          const clinicPatientIds = await resolveClinicPatientIds(context.clinicaId)
          if (!clinicPatientIds.includes(patientId)) {
            return { success: false, error: 'No tienes acceso a este paciente' }
          }
        } else if (context.role === 'medico') {
          const admin = getSupabaseAdmin()
          const { data: owned } = await admin.from('patients').select('id').eq('id', patientId).eq('user_id', context.userId).single()
          if (!owned) {
            const { data: linked } = await admin.from('patient_medico_links').select('id').eq('patient_id', patientId).eq('medico_user_id', context.userId).eq('status', 'active').single()
            if (!linked) return { success: false, error: 'No tienes acceso a este paciente' }
          }
        }

        const biomarkers = toolInput.biomarkers as string[]
        const months = (toolInput.period_months as number | undefined) ?? 6

        const result = await queryBiomarkerTrends(patientId, biomarkers, months)

        return { success: true, data: result }
      }

      // ── Flexible patient search ─────────────────────────────────
      case 'query_patient_search': {
        const result = await queryPatientsByFilters({
          clinica_id: context.clinicaId ?? undefined,
          medico_user_id: (toolInput.medico_id as string | undefined) ?? (context.role === 'medico' ? context.userId : undefined),
          score_system: toolInput.score_system as string | undefined,
          score_operator: toolInput.score_operator as string | undefined,
          score_value: toolInput.score_value as number | undefined,
          biomarker_status: toolInput.biomarker_status as string | undefined,
          age_min: toolInput.age_min as number | undefined,
          age_max: toolInput.age_max as number | undefined,
          limit: toolInput.limit as number | undefined,
        })

        return { success: true, data: { total: result.length, patients: result } }
      }

      // ── Generate PDF ────────────────────────────────────────────
      case 'generate_pdf': {
        // Por ahora retorna los datos para que el frontend genere el PDF
        // La generación real con jsPDF se implementará en el siguiente paso
        return {
          success: true,
          data: {
            status: 'ready',
            title: toolInput.title,
            type: toolInput.type,
            content: toolInput.content,
            message: 'PDF listo para descarga. El contenido ha sido preparado.',
          },
        }
      }

      // ── Send Slack ──────────────────────────────────────────────
      case 'send_slack': {
        // Slack integration pendiente de configuración
        // Requiere SLACK_BOT_TOKEN en env y canales configurados por clínica
        const slackToken = process.env.SLACK_BOT_TOKEN
        if (!slackToken) {
          return {
            success: false,
            error: 'La integración con Slack no está configurada. Se requiere configurar SLACK_BOT_TOKEN en las variables de entorno y los canales en la configuración de la clínica.',
          }
        }

        const channel = toolInput.channel as string
        const message = toolInput.message as string

        // SECURITY: validar canal contra allowlist para prevenir exfiltración vía prompt injection
        const allowedChannels = (process.env.SLACK_ALLOWED_CHANNELS ?? 'longevity-alerts,longevity-reports')
          .split(',').map(c => c.trim())
        if (!allowedChannels.includes(channel)) {
          return {
            success: false,
            error: `Canal '${channel}' no permitido. Canales disponibles: ${allowedChannels.join(', ')}`,
          }
        }
        const alertLevel = toolInput.alert_level as string | undefined

        // Mapear nivel de alerta a color de Slack
        const colorMap: Record<string, string> = {
          info: '#3b82f6',
          warning: '#f59e0b',
          danger: '#ef4444',
          critical: '#dc2626',
        }

        const payload: Record<string, unknown> = {
          channel,
          text: message,
        }

        if (alertLevel && colorMap[alertLevel]) {
          payload.attachments = [{
            color: colorMap[alertLevel],
            text: message,
            footer: 'Longevity IA',
            ts: Math.floor(Date.now() / 1000),
          }]
          payload.text = undefined
        }

        const res = await fetch('https://slack.com/api/chat.postMessage', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${slackToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        })

        const slackRes = await res.json() as { ok: boolean; error?: string }
        if (!slackRes.ok) {
          return { success: false, error: `Error de Slack: ${slackRes.error}` }
        }

        return { success: true, data: { sent: true, channel, alert_level: alertLevel } }
      }

      default:
        return { success: false, error: `Tool desconocido: ${toolName}` }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno ejecutando tool'
    console.error(`[agent-tool-executor] ${toolName} error:`, message)
    return { success: false, error: message }
  }
}
