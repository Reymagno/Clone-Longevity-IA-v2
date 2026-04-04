/**
 * Definición de tools para el agente de chat (Claude tool_use).
 * Cada tool mapea a un query step. El rol del usuario determina qué tools están disponibles.
 */

import type Anthropic from '@anthropic-ai/sdk'

// ── Tool definitions ────────────────────────────────────────────────

const QUERY_PATIENTS: Anthropic.Tool = {
  name: 'query_patients',
  description: 'Busca pacientes por criterios clínicos: biomarcadores en peligro, scores bajos, sin análisis reciente, alertas críticas. Usa esto cuando te pidan información sobre pacientes que cumplen cierta condición.',
  input_schema: {
    type: 'object' as const,
    properties: {
      criteria: {
        type: 'string',
        enum: ['danger_biomarkers', 'low_system_score', 'critical_alerts', 'no_recent_analysis'],
        description: 'Tipo de búsqueda: danger_biomarkers = biomarcadores en peligro, low_system_score = score bajo por sistema, critical_alerts = alertas críticas sin leer, no_recent_analysis = sin análisis en N días',
      },
      system: {
        type: 'string',
        enum: ['cardiovascular', 'metabolic', 'hepatic', 'renal', 'immune', 'hematologic', 'inflammatory', 'vitamins'],
        description: 'Sistema orgánico para filtrar (solo para low_system_score)',
      },
      threshold: {
        type: 'number',
        description: 'Umbral: score mínimo (para low_system_score, default 50) o días sin análisis (para no_recent_analysis, default 90)',
      },
      medico_id: {
        type: 'string',
        description: 'Filtrar por un médico específico (su user_id). Omitir para buscar en toda la clínica.',
      },
    },
    required: ['criteria'],
  },
}

const QUERY_MEDICO_SESSIONS: Anthropic.Tool = {
  name: 'query_medico_sessions',
  description: 'Consulta inicios de sesión y actividad de un médico específico: cuántas veces inició sesión, días activos, tiempo total en plataforma, última vez visto.',
  input_schema: {
    type: 'object' as const,
    properties: {
      medico_id: {
        type: 'string',
        description: 'El user_id del médico. Si no se proporciona, busca por nombre.',
      },
      medico_name: {
        type: 'string',
        description: 'Nombre del médico para buscar (si no se tiene el ID).',
      },
      period: {
        type: 'string',
        enum: ['today', 'week', 'month', 'quarter'],
        description: 'Periodo de tiempo para consultar.',
      },
    },
    required: ['period'],
  },
}

const QUERY_ACTIVE_MEDICOS: Anthropic.Tool = {
  name: 'query_active_medicos',
  description: 'Lista qué médicos de la clínica han estado activos o inactivos en un periodo. Muestra conteo de sesiones, días activos y tiempo en plataforma por cada médico.',
  input_schema: {
    type: 'object' as const,
    properties: {
      period: {
        type: 'string',
        enum: ['today', 'week', 'month', 'quarter'],
        description: 'Periodo de tiempo.',
      },
    },
    required: ['period'],
  },
}

const QUERY_CLINIC_ACTIVITY: Anthropic.Tool = {
  name: 'query_clinic_activity',
  description: 'Obtiene métricas operativas de la clínica: análisis generados, consultas, pacientes creados, notas clínicas, notas de voz, alertas generadas/resueltas. Puede agrupar por médico o por día.',
  input_schema: {
    type: 'object' as const,
    properties: {
      period: {
        type: 'string',
        enum: ['today', 'week', 'month', 'quarter'],
        description: 'Periodo de tiempo.',
      },
      metrics: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['analyses_count', 'consultations_count', 'patients_created', 'voice_notes_count', 'clinical_notes_count', 'alerts_generated', 'alerts_resolved'],
        },
        description: 'Métricas a consultar. Si no se especifica, se consultan todas.',
      },
      group_by: {
        type: 'string',
        enum: ['medico', 'day', 'none'],
        description: 'Agrupación de resultados. "medico" muestra por médico, "day" por día.',
      },
    },
    required: ['period'],
  },
}

const QUERY_DOCTOR_PERFORMANCE: Anthropic.Tool = {
  name: 'query_doctor_performance',
  description: 'Métricas de rendimiento por médico: pacientes totales, análisis realizados, consultas, notas clínicas, alertas pendientes y resueltas. Ideal para evaluar productividad.',
  input_schema: {
    type: 'object' as const,
    properties: {
      period: {
        type: 'string',
        enum: ['today', 'week', 'month', 'quarter'],
        description: 'Periodo de tiempo para las métricas.',
      },
    },
    required: ['period'],
  },
}

const QUERY_BIOMARKER_TRENDS: Anthropic.Tool = {
  name: 'query_biomarker_trends',
  description: 'Obtiene la evolución temporal de biomarcadores específicos de un paciente. Muestra valores y estatus en cada análisis del periodo.',
  input_schema: {
    type: 'object' as const,
    properties: {
      patient_id: {
        type: 'string',
        description: 'ID del paciente.',
      },
      patient_name: {
        type: 'string',
        description: 'Nombre del paciente (si no se tiene el ID, se buscará).',
      },
      biomarkers: {
        type: 'array',
        items: { type: 'string' },
        description: 'Lista de biomarcadores a consultar. Ejemplos: ldl, hdl, glucose, hba1c, creatinine, triglycerides, hemoglobin, vitaminD, tsh, crp, homocysteine, ferritin, insulin, alt, ast.',
      },
      period_months: {
        type: 'number',
        description: 'Meses hacia atrás para consultar (default: 6).',
      },
    },
    required: ['biomarkers'],
  },
}

const QUERY_PATIENT_SEARCH: Anthropic.Tool = {
  name: 'query_patient_search',
  description: 'Búsqueda flexible de pacientes por múltiples filtros combinados: rango de edad, score de sistema con operador, estatus de biomarcador, médico específico.',
  input_schema: {
    type: 'object' as const,
    properties: {
      score_system: {
        type: 'string',
        enum: ['cardiovascular', 'metabolic', 'hepatic', 'renal', 'immune', 'hematologic', 'inflammatory', 'vitamins'],
        description: 'Sistema orgánico para filtrar por score.',
      },
      score_operator: {
        type: 'string',
        enum: ['lt', 'gt', 'eq', 'lte', 'gte'],
        description: 'Operador de comparación para el score.',
      },
      score_value: {
        type: 'number',
        description: 'Valor de score a comparar.',
      },
      biomarker_status: {
        type: 'string',
        enum: ['optimal', 'normal', 'warning', 'danger'],
        description: 'Filtrar pacientes que tengan biomarcadores con este estatus.',
      },
      age_min: { type: 'number', description: 'Edad mínima.' },
      age_max: { type: 'number', description: 'Edad máxima.' },
      medico_id: { type: 'string', description: 'Filtrar por médico específico.' },
      limit: { type: 'number', description: 'Máximo de resultados (default 20).' },
    },
    required: [],
  },
}

const GENERATE_PDF: Anthropic.Tool = {
  name: 'generate_pdf',
  description: 'Genera un documento PDF con los datos proporcionados. El PDF se guarda temporalmente y se retorna una URL de descarga. Usa esto cuando el usuario pida descargar, exportar o generar un reporte/documento.',
  input_schema: {
    type: 'object' as const,
    properties: {
      title: {
        type: 'string',
        description: 'Título del documento PDF.',
      },
      type: {
        type: 'string',
        enum: ['medico_activity_report', 'critical_patients_report', 'clinic_weekly_summary', 'biomarker_trends_report', 'custom_query_results'],
        description: 'Tipo de reporte a generar.',
      },
      content: {
        type: 'string',
        description: 'Contenido formateado en markdown para incluir en el PDF. Incluye tablas, listas y secciones.',
      },
    },
    required: ['title', 'type', 'content'],
  },
}

const SEND_SLACK: Anthropic.Tool = {
  name: 'send_slack',
  description: 'Envía un mensaje a un canal de Slack. Puede incluir texto formateado y nivel de urgencia. Usa esto cuando el usuario pida notificar, enviar, o compartir por Slack.',
  input_schema: {
    type: 'object' as const,
    properties: {
      channel: {
        type: 'string',
        description: 'Nombre del canal de Slack (sin #). Ejemplo: urgencias, directores, general.',
      },
      message: {
        type: 'string',
        description: 'Mensaje a enviar, puede usar formato Slack (markdown).',
      },
      alert_level: {
        type: 'string',
        enum: ['info', 'warning', 'danger', 'critical'],
        description: 'Nivel de urgencia del mensaje (afecta color y formato).',
      },
    },
    required: ['channel', 'message'],
  },
}

// ── Role-based tool sets ────────────────────────────────────────────

export const MEDICO_TOOLS: Anthropic.Tool[] = [
  QUERY_BIOMARKER_TRENDS,
  QUERY_PATIENT_SEARCH,
  GENERATE_PDF,
  SEND_SLACK,
]

export const CLINICA_TOOLS: Anthropic.Tool[] = [
  QUERY_PATIENTS,
  QUERY_MEDICO_SESSIONS,
  QUERY_ACTIVE_MEDICOS,
  QUERY_CLINIC_ACTIVITY,
  QUERY_DOCTOR_PERFORMANCE,
  QUERY_BIOMARKER_TRENDS,
  QUERY_PATIENT_SEARCH,
  GENERATE_PDF,
  SEND_SLACK,
]

export function getToolsForRole(role: string): Anthropic.Tool[] {
  switch (role) {
    case 'clinica': return CLINICA_TOOLS
    case 'medico': return MEDICO_TOOLS
    default: return []
  }
}
