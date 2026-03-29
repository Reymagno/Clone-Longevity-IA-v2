'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PatientIntakeChat } from '@/components/patients/PatientIntakeChat'
import {
  Activity, AlertTriangle, Apple, Brain, CheckCircle2, ChevronRight,
  ClipboardList, Dumbbell, FileText, Heart, HeartPulse, Pill,
  RefreshCw, Sparkles, ArrowLeft, Users, Shield, Zap, Droplets,
} from 'lucide-react'
import { toast } from 'sonner'
import type { Patient, LabResult, ClinicalHistory } from '@/types'

interface Props {
  patient: Patient
  result: LabResult
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface SectionItem {
  label: string
  value: string
  alert?: boolean
}

interface Section {
  title: string
  icon: React.ElementType
  color: string
  items: SectionItem[]
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ClinicalHistoryTab({ patient, result }: Props) {
  const router = useRouter()
  const [showChat, setShowChat] = useState(!patient.clinical_history)
  const [reanalyzing, setReanalyzing] = useState(false)
  const [justSaved, setJustSaved] = useState(false)

  function handleComplete() {
    setShowChat(false)
    setJustSaved(true)
    toast.success('Historia clínica guardada')
    router.refresh()
  }

  async function handleReanalyze() {
    setReanalyzing(true)
    try {
      const res = await fetch(`/api/results/${result.id}/reanalyze`, {
        method: 'POST',
        credentials: 'same-origin',
      })

      if (!res.ok || !res.body) throw new Error(`Error ${res.status}`)

      // Read SSE stream — keepalive bytes prevent Vercel 504
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          let event: { ok: boolean; step?: string; error?: string } | null = null
          try { event = JSON.parse(line.slice(6)) } catch { continue }
          if (!event) continue
          if (!event.ok) throw new Error(event.error || 'Error al re-analizar')
          if (event.step === 'done') {
            toast.success('¡Análisis actualizado con tu historia clínica!')
            router.refresh()
          }
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al re-analizar')
    } finally {
      setReanalyzing(false)
    }
  }

  // ── Vista: chat de intake ──────────────────────────────────────────────────
  if (showChat) {
    return (
      <div className="max-w-2xl mx-auto space-y-5">
        {/* Chat header */}
        <div className="flex items-center gap-3">
          {patient.clinical_history && (
            <button
              onClick={() => setShowChat(false)}
              className="flex items-center justify-center w-8 h-8 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-accent/50 transition-colors shrink-0"
              aria-label="Volver al resumen"
            >
              <ArrowLeft size={15} />
            </button>
          )}
          <div>
            <h2 className="text-xl font-bold text-foreground">
              {patient.clinical_history ? 'Actualizar Historia Clínica' : 'Completar Historia Clínica'}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Esta información personaliza y enriquece tu análisis de longevidad.
            </p>
          </div>
        </div>

        <PatientIntakeChat
          patientId={patient.id}
          patientName={patient.name}
          onComplete={handleComplete}
        />
      </div>
    )
  }

  // ── Vista: resumen + re-análisis ───────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          {/* Status icon */}
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            style={{
              background: patient.clinical_history ? 'rgba(46,174,123,0.12)' : 'rgba(107,114,128,0.1)',
              border: patient.clinical_history ? '1px solid rgba(46,174,123,0.25)' : '1px solid rgba(107,114,128,0.2)',
            }}
          >
            {patient.clinical_history
              ? <CheckCircle2 size={18} className="text-accent" />
              : <ClipboardList size={18} className="text-muted-foreground" />
            }
          </div>

          <div>
            {/* Title + badge */}
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-foreground leading-tight">
                {justSaved
                  ? '¡Historia Clínica guardada!'
                  : patient.clinical_history
                  ? 'Historia Clínica Completada'
                  : 'Sin historia clínica'}
              </p>
              {patient.clinical_history && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-accent/10 text-accent border border-accent/20">
                  <CheckCircle2 size={10} />
                  Completa
                </span>
              )}
            </div>

            {/* Date */}
            {patient.clinical_history && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Actualizada el{' '}
                {new Date(patient.clinical_history.completed_at).toLocaleDateString('es-MX', {
                  day: '2-digit', month: 'long', year: 'numeric',
                })}
              </p>
            )}
          </div>
        </div>

        {/* Update button */}
        <button
          onClick={() => { setShowChat(true); setJustSaved(false) }}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground border border-border px-4 py-2 rounded-lg hover:text-foreground hover:border-accent/40 hover:bg-accent/5 transition-all shrink-0"
        >
          <RefreshCw size={14} />
          {patient.clinical_history ? 'Actualizar historial' : 'Completar historial'}
        </button>
      </div>

      {/* ── Content: history exists ── */}
      {patient.clinical_history ? (
        <>
          {/* Summary cards grid */}
          <HistorySummary history={patient.clinical_history} />

          {/* Re-analyze CTA card */}
          <div
            className="card-medical p-5 border border-accent/30"
            style={{ background: 'linear-gradient(to right, rgba(46,174,123,0.08), rgba(46,174,123,0.03))' }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              {/* Left: icon + copy */}
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: 'rgba(46,174,123,0.12)', border: '1px solid rgba(46,174,123,0.25)' }}
                >
                  <Brain size={17} className="text-accent" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-foreground text-sm mb-0.5">
                    {justSaved
                      ? 'Actualiza tu análisis con esta nueva información'
                      : 'Personaliza tu análisis con la historia clínica'}
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    La IA re-procesa tus biomarcadores incorporando estilo de vida, historial familiar, alergias y medicamentos para un protocolo más preciso.
                  </p>
                </div>
              </div>

              {/* Right: CTA button */}
              <div className="sm:shrink-0">
                <button
                  onClick={handleReanalyze}
                  disabled={reanalyzing}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-accent text-background text-sm font-semibold rounded-lg hover:bg-accent/90 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-sm"
                  style={{ boxShadow: reanalyzing ? undefined : '0 0 0 0 transparent' }}
                >
                  {reanalyzing ? (
                    <>
                      <span className="w-4 h-4 rounded-full border-2 border-background/30 border-t-background animate-spin" />
                      Re-analizando… (2-5 min)
                    </>
                  ) : (
                    <>
                      <Sparkles size={15} />
                      Actualizar Análisis con Historia Clínica
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* ── Empty state ── */
        <div className="card-medical p-12 flex flex-col items-center text-center">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center mb-5"
            style={{ background: 'rgba(107,114,128,0.08)', border: '1px solid rgba(107,114,128,0.12)' }}
          >
            <ClipboardList size={40} className="text-muted-foreground" strokeWidth={1.25} />
          </div>

          <h3 className="text-lg font-bold text-foreground mb-2">
            Completa tu Historia Clínica
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm leading-relaxed mb-7">
            Un asistente conversacional recopilará tu información en ~10 minutos. Esta información personaliza tu protocolo de longevidad.
          </p>

          <button
            onClick={() => setShowChat(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-background text-sm font-semibold rounded-xl hover:bg-accent/90 transition-all shadow-sm"
          >
            Comenzar Historia Clínica
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  )
}

// ─── History Summary ──────────────────────────────────────────────────────────

function HistorySummary({ history }: { history: ClinicalHistory }) {
  const h = history as unknown as Record<string, unknown>
  const anthro    = h['anthropometric']    as Record<string, unknown> | undefined
  const allergies = h['allergies']         as Record<string, unknown> | undefined
  const diet      = h['diet']              as Record<string, unknown> | undefined
  const pa        = h['physical_activity'] as Record<string, unknown> | undefined
  const sleep     = h['sleep']             as Record<string, unknown> | undefined
  const mh        = h['mental_health']     as Record<string, unknown> | undefined
  const cv        = h['cardiovascular']    as Record<string, unknown> | undefined
  const medHist   = h['medical_history']   as Record<string, unknown> | undefined
  const fam       = h['family_history']    as Record<string, unknown> | undefined
  // Legacy fields
  const lifestyle     = h['lifestyle']      as Record<string, unknown> | undefined
  const recentIllness = h['recent_illness'] as Record<string, unknown> | undefined

  const sections: Section[] = [
    {
      title: 'Datos Generales',
      icon: Activity,
      color: '#2EAE7B',
      items: [
        anthro?.['waist_cm'] != null
          ? { label: 'Cintura', value: `${anthro['waist_cm']} cm` }
          : null,
        anthro?.['blood_pressure']
          ? { label: 'Presión arterial', value: `${anthro['blood_pressure']} mmHg` }
          : null,
        anthro?.['energy_level']
          ? { label: 'Energía', value: (anthro['energy_level'] as string).split(' — ')[0] }
          : null,
      ].filter(Boolean) as SectionItem[],
    },
    {
      title: 'Alergias',
      icon: Shield,
      color: '#f59e0b',
      items: [
        allergies?.['food']
          ? { label: 'Alimentaria', value: String(allergies['food']) }
          : null,
        allergies?.['medication']
          ? { label: 'Medicamento', value: String(allergies['medication']), alert: true }
          : null,
        allergies?.['environmental'] && allergies['environmental'] !== 'No tengo'
          ? { label: 'Ambiental', value: String(allergies['environmental']) }
          : null,
      ].filter(Boolean) as SectionItem[],
    },
    {
      title: 'Alimentación',
      icon: Apple,
      color: '#22c55e',
      items: [
        diet?.['type']
          ? { label: 'Tipo', value: String(diet['type']) }
          : null,
        diet?.['meals_per_day']
          ? { label: 'Comidas al día', value: String(diet['meals_per_day']) }
          : null,
        diet?.['water_intake']
          ? { label: 'Agua', value: String(diet['water_intake']) }
          : null,
        diet?.['processed_food']
          ? { label: 'Procesados', value: String(diet['processed_food']) }
          : null,
        diet?.['alcohol']
          ? { label: 'Alcohol', value: String(diet['alcohol']) }
          : null,
        diet?.['supplements']
          ? { label: 'Suplementos', value: String(diet['supplements']) }
          : null,
      ].filter(Boolean) as SectionItem[],
    },
    {
      title: 'Actividad y Sueño',
      icon: Dumbbell,
      color: '#3b82f6',
      items: [
        (pa?.['type'] || lifestyle?.['exercise'])
          ? { label: 'Ejercicio', value: String(pa?.['type'] ?? lifestyle?.['exercise']) }
          : null,
        pa?.['frequency']
          ? { label: 'Frecuencia', value: String(pa['frequency']) }
          : null,
        pa?.['sedentary_hours']
          ? { label: 'Sedentarismo', value: `${pa['sedentary_hours']} al día` }
          : null,
        (sleep?.['hours'] || lifestyle?.['sleep_hours'])
          ? { label: 'Sueño', value: String(sleep?.['hours'] ?? lifestyle?.['sleep_hours']) }
          : null,
        sleep?.['quality']
          ? { label: 'Calidad de sueño', value: (sleep['quality'] as string).split(' — ')[0] }
          : null,
        sleep?.['snoring'] && sleep['snoring'] !== 'No / No sé'
          ? { label: 'Ronquido', value: String(sleep['snoring']) }
          : null,
      ].filter(Boolean) as SectionItem[],
    },
    {
      title: 'Salud Mental',
      icon: Brain,
      color: '#a78bfa',
      items: [
        (mh?.['stress_level'] || lifestyle?.['stress_level'])
          ? {
              label: 'Estrés',
              value: String(mh?.['stress_level'] ?? lifestyle?.['stress_level'] ?? '').split(' — ')[0],
            }
          : null,
        mh?.['mood']
          ? { label: 'Ánimo', value: String(mh['mood']) }
          : null,
        mh?.['anxiety']
          ? { label: 'Ansiedad', value: (mh['anxiety'] as string).split(',')[0] }
          : null,
        mh?.['cognitive']
          ? { label: 'Cognición', value: (mh['cognitive'] as string).split(' — ')[0] }
          : null,
      ].filter(Boolean) as SectionItem[],
    },
    {
      title: 'Salud Cardiovascular',
      icon: HeartPulse,
      color: '#ef4444',
      items: [
        cv?.['chest_pain'] && cv['chest_pain'] !== 'Nunca'
          ? { label: 'Dolor pecho', value: String(cv['chest_pain']) }
          : null,
        cv?.['shortness_of_breath'] && cv['shortness_of_breath'] !== 'No'
          ? { label: 'Disnea', value: String(cv['shortness_of_breath']) }
          : null,
        cv?.['palpitations'] && cv['palpitations'] !== 'Nunca'
          ? { label: 'Palpitaciones', value: String(cv['palpitations']) }
          : null,
        cv?.['thyroid_symptoms'] && cv['thyroid_symptoms'] !== 'Ninguno de estos'
          ? { label: 'Tiroides', value: (cv['thyroid_symptoms'] as string).substring(0, 45) + '…' }
          : null,
        cv?.['hormonal_symptoms']
          ? { label: 'Síntomas hormonales', value: String(cv['hormonal_symptoms']) }
          : null,
      ].filter(Boolean) as SectionItem[],
    },
    {
      title: 'Historial Médico',
      icon: Pill,
      color: '#f97316',
      items: [
        (() => {
          const c = medHist?.['chronic_conditions'] as string[] | undefined
          return c && c.length > 0
            ? { label: 'Condiciones crónicas', value: c.join(', '), alert: true }
            : null
        })(),
        medHist?.['surgeries']
          ? { label: 'Cirugías', value: String(medHist['surgeries']) }
          : null,
        (medHist?.['smoker'] || lifestyle?.['smoker'])
          ? { label: 'Tabaco', value: String(medHist?.['smoker'] ?? lifestyle?.['smoker']) }
          : null,
        medHist?.['current_medications']
          ? { label: 'Medicamentos actuales', value: String(medHist['current_medications']), alert: true }
          : null,
        medHist?.['recent_condition']
          ? { label: 'Condición reciente', value: String(medHist['recent_condition']) }
          : null,
        !medHist?.['recent_condition'] && recentIllness?.['condition']
          ? { label: 'Condición reciente', value: String(recentIllness['condition']) }
          : null,
        !medHist?.['current_medications'] && recentIllness?.['current_medications']
          ? { label: 'Medicamentos', value: String(recentIllness['current_medications']), alert: true }
          : null,
      ].filter(Boolean) as SectionItem[],
    },
    {
      title: 'Historial Familiar',
      icon: Users,
      color: '#06b6d4',
      items: [
        (() => {
          const c = fam?.['conditions'] as string[] | undefined
          return c && c.length > 0
            ? { label: 'Condiciones', value: c.join(', ') }
            : null
        })(),
        fam?.['longevity']
          ? { label: 'Longevidad familiar', value: String(fam['longevity']) }
          : null,
        fam?.['details']
          ? { label: 'Detalles', value: String(fam['details']) }
          : null,
      ].filter(Boolean) as SectionItem[],
    },
  ].filter(s => s.items.length > 0)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {sections.map(section => {
        const Icon = section.icon
        return (
          <div key={section.title} className="card-medical overflow-hidden">
            {/* Card header */}
            <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-border/50">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{
                  background: `${section.color}18`,
                  border: `1px solid ${section.color}30`,
                }}
              >
                <Icon size={15} style={{ color: section.color }} />
              </div>
              <p className="text-sm font-semibold text-foreground leading-tight">
                {section.title}
              </p>
            </div>

            {/* Card body */}
            <div className="px-4 py-3 space-y-2">
              {section.items.map((item, i) =>
                item.alert ? (
                  <div
                    key={i}
                    className="flex items-start justify-between gap-2 px-2 py-1.5 rounded border-l-2"
                    style={{
                      borderLeftColor: '#f59e0b',
                      background: 'rgba(245,158,11,0.07)',
                    }}
                  >
                    <span className="text-xs text-muted-foreground uppercase tracking-wide leading-relaxed pt-0.5 shrink-0">
                      {item.label}
                    </span>
                    <span className="text-sm font-medium text-foreground text-right leading-relaxed">
                      {item.value}
                    </span>
                  </div>
                ) : (
                  <div key={i} className="flex items-start justify-between gap-2">
                    <span className="text-xs text-muted-foreground uppercase tracking-wide leading-relaxed pt-0.5 shrink-0">
                      {item.label}
                    </span>
                    <span className="text-sm font-medium text-foreground text-right leading-relaxed">
                      {item.value}
                    </span>
                  </div>
                )
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
