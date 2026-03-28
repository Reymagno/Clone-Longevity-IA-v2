'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PatientIntakeChat } from '@/components/patients/PatientIntakeChat'
import {
  CheckCircle2, RefreshCw, Brain, Sparkles, ClipboardList, ArrowLeft,
} from 'lucide-react'
import { toast } from 'sonner'
import type { Patient, LabResult, ClinicalHistory } from '@/types'

interface Props {
  patient: Patient
  result: LabResult
}

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
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error((data as { error?: string })?.error || `Error ${res.status}`)
      toast.success('¡Análisis actualizado con tu historia clínica!')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al re-analizar')
    } finally {
      setReanalyzing(false)
    }
  }

  // ── Vista: chat de intake ───────────────────────────────────────────────────
  if (showChat) {
    return (
      <div className="max-w-2xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">
              {patient.clinical_history ? 'Actualizar Historia Clínica' : 'Completar Historia Clínica'}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Esta información personaliza y enriquece tu análisis de longevidad.
            </p>
          </div>
          {patient.clinical_history && (
            <button
              onClick={() => setShowChat(false)}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              <ArrowLeft size={14} />
              Volver
            </button>
          )}
        </div>

        <PatientIntakeChat
          patientId={patient.id}
          patientName={patient.name}
          onComplete={handleComplete}
        />
      </div>
    )
  }

  // ── Vista: resumen + re-análisis ────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Encabezado */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center">
            {patient.clinical_history
              ? <CheckCircle2 size={18} className="text-accent" />
              : <ClipboardList size={18} className="text-muted-foreground" />
            }
          </div>
          <div>
            <p className="font-semibold text-foreground">
              {justSaved
                ? '¡Historia Clínica guardada!'
                : patient.clinical_history
                ? 'Historia Clínica Completada'
                : 'Sin historia clínica'}
            </p>
            {patient.clinical_history && (
              <p className="text-xs text-muted-foreground">
                Actualizada el{' '}
                {new Date(patient.clinical_history.completed_at).toLocaleDateString('es-MX', {
                  day: '2-digit', month: 'long', year: 'numeric',
                })}
              </p>
            )}
          </div>
        </div>

        <button
          onClick={() => { setShowChat(true); setJustSaved(false) }}
          className="flex items-center gap-2 text-sm text-muted-foreground border border-border px-4 py-2 rounded-lg hover:text-foreground hover:border-accent/50 transition-colors"
        >
          <RefreshCw size={14} />
          {patient.clinical_history ? 'Actualizar historial' : 'Completar historial'}
        </button>
      </div>

      {/* Resumen del historial */}
      {patient.clinical_history
        ? <HistorySummary history={patient.clinical_history} />
        : (
          <div className="card-medical p-10 text-center">
            <ClipboardList size={36} className="text-muted-foreground mx-auto mb-3" />
            <p className="font-medium text-foreground mb-1">Sin historial clínico</p>
            <p className="text-sm text-muted-foreground mb-5">
              Completa tu historia clínica para que la IA pueda personalizar el protocolo de longevidad.
            </p>
            <button
              onClick={() => setShowChat(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent text-background text-sm font-medium rounded-lg hover:bg-accent/90 transition-colors"
            >
              <ClipboardList size={14} />
              Comenzar ahora
            </button>
          </div>
        )
      }

      {/* Banner de re-análisis */}
      {patient.clinical_history && (
        <div className="card-medical p-5 border-accent/30 bg-accent/5">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
              <Brain size={16} className="text-accent" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-foreground mb-0.5">
                {justSaved
                  ? 'Actualiza tu análisis con esta nueva información'
                  : 'Re-analizar incorporando tu historia clínica'}
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                La IA re-procesa tus biomarcadores incorporando tu estilo de vida, historial familiar, alergias y medicamentos actuales para personalizar el protocolo.
              </p>
              <button
                onClick={handleReanalyze}
                disabled={reanalyzing}
                className="flex items-center gap-2 px-4 py-2 bg-accent text-background text-sm font-medium rounded-lg hover:bg-accent/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {reanalyzing ? (
                  <>
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-background/30 border-t-background animate-spin" />
                    Re-analizando con IA… (2-5 min)
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    Actualizar Análisis con Historia Clínica
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Resumen visual del historial ─────────────────────────────────────────────

function HistorySummary({ history }: { history: ClinicalHistory }) {
  const h = history as unknown as Record<string, unknown>
  const anthro   = h['anthropometric']    as Record<string, unknown> | undefined
  const allergies= h['allergies']         as Record<string, unknown> | undefined
  const diet     = h['diet']              as Record<string, unknown> | undefined
  const pa       = h['physical_activity'] as Record<string, unknown> | undefined
  const sleep    = h['sleep']             as Record<string, unknown> | undefined
  const mh       = h['mental_health']     as Record<string, unknown> | undefined
  const cv       = h['cardiovascular']    as Record<string, unknown> | undefined
  const medHist  = h['medical_history']   as Record<string, unknown> | undefined
  const fam      = h['family_history']    as Record<string, unknown> | undefined
  // Legacy
  const lifestyle     = h['lifestyle']     as Record<string, unknown> | undefined
  const recentIllness = h['recent_illness'] as Record<string, unknown> | undefined

  const sections = [
    {
      title: 'Datos Generales',
      items: [
        anthro?.['waist_cm'] != null && `Cintura: ${anthro['waist_cm']} cm`,
        anthro?.['blood_pressure'] && `Presión arterial: ${anthro['blood_pressure']} mmHg`,
        anthro?.['energy_level'] && `Energía: ${(anthro['energy_level'] as string).split(' — ')[0]}`,
      ].filter(Boolean) as string[],
    },
    {
      title: 'Alergias',
      items: [
        allergies?.['food'] && `Alimentaria: ${allergies['food']}`,
        allergies?.['medication'] && `⚠ Medicamento: ${allergies['medication']}`,
        allergies?.['environmental'] && allergies['environmental'] !== 'No tengo' && `Ambiental: ${allergies['environmental']}`,
      ].filter(Boolean) as string[],
    },
    {
      title: 'Alimentación',
      items: [
        diet?.['type'] && `Tipo: ${diet['type']}`,
        diet?.['meals_per_day'] && `Comidas: ${diet['meals_per_day']}`,
        diet?.['water_intake'] && `Agua: ${diet['water_intake']}`,
        diet?.['processed_food'] && `Procesados: ${diet['processed_food']}`,
        diet?.['alcohol'] && `Alcohol: ${diet['alcohol']}`,
        diet?.['supplements'] && `Suplementos: ${diet['supplements']}`,
      ].filter(Boolean) as string[],
    },
    {
      title: 'Actividad Física y Sueño',
      items: [
        (pa?.['type'] || lifestyle?.['exercise']) && `Ejercicio: ${pa?.['type'] || lifestyle?.['exercise']}`,
        pa?.['frequency'] && `Frecuencia: ${pa['frequency']}`,
        pa?.['sedentary_hours'] && `Sedentarismo: ${pa['sedentary_hours']} al día`,
        (sleep?.['hours'] || lifestyle?.['sleep_hours']) && `Sueño: ${sleep?.['hours'] || lifestyle?.['sleep_hours']}`,
        sleep?.['quality'] && `Calidad: ${(sleep['quality'] as string).split(' — ')[0]}`,
        sleep?.['snoring'] && sleep['snoring'] !== 'No / No sé' && `Ronquido: ${sleep['snoring']}`,
      ].filter(Boolean) as string[],
    },
    {
      title: 'Salud Mental',
      items: [
        (mh?.['stress_level'] || lifestyle?.['stress_level']) && `Estrés: ${String(mh?.['stress_level'] ?? lifestyle?.['stress_level'] ?? '').split(' — ')[0]}`,
        mh?.['mood'] && `Ánimo: ${mh['mood']}`,
        mh?.['anxiety'] && `Ansiedad: ${(mh['anxiety'] as string).split(',')[0]}`,
        mh?.['cognitive'] && `Cognición: ${(mh['cognitive'] as string).split(' — ')[0]}`,
      ].filter(Boolean) as string[],
    },
    {
      title: 'Salud Cardiovascular',
      items: [
        cv?.['chest_pain'] && cv['chest_pain'] !== 'Nunca' && `Dolor pecho: ${cv['chest_pain']}`,
        cv?.['shortness_of_breath'] && cv['shortness_of_breath'] !== 'No' && `Disnea: ${cv['shortness_of_breath']}`,
        cv?.['palpitations'] && cv['palpitations'] !== 'Nunca' && `Palpitaciones: ${cv['palpitations']}`,
        cv?.['thyroid_symptoms'] && cv['thyroid_symptoms'] !== 'Ninguno de estos' && `Tiroides: ${(cv['thyroid_symptoms'] as string).substring(0, 45)}…`,
        cv?.['hormonal_symptoms'] && `Hormonal: ${cv['hormonal_symptoms']}`,
      ].filter(Boolean) as string[],
    },
    {
      title: 'Historial Médico',
      items: [
        (() => { const c = medHist?.['chronic_conditions'] as string[] | undefined; return c && c.length > 0 ? `Condiciones: ${c.join(', ')}` : null })(),
        medHist?.['surgeries'] && `Cirugías: ${medHist['surgeries']}`,
        (medHist?.['smoker'] || lifestyle?.['smoker']) && `Tabaco: ${medHist?.['smoker'] || lifestyle?.['smoker']}`,
        medHist?.['current_medications'] && `Medicamentos: ${medHist['current_medications']}`,
        medHist?.['recent_condition'] && `Condición reciente: ${medHist['recent_condition']}`,
        (!medHist?.['recent_condition'] && recentIllness?.['condition']) && `Condición reciente: ${recentIllness['condition']}`,
        (!medHist?.['current_medications'] && recentIllness?.['current_medications']) && `Medicamentos: ${recentIllness['current_medications']}`,
      ].filter(Boolean) as string[],
    },
    {
      title: 'Historial Familiar',
      items: [
        (() => { const c = fam?.['conditions'] as string[] | undefined; return c && c.length > 0 ? `Condiciones: ${c.join(', ')}` : null })(),
        fam?.['longevity'] && `Longevidad: ${fam['longevity']}`,
        fam?.['details'] && `Detalles: ${fam['details']}`,
      ].filter(Boolean) as string[],
    },
  ].filter(s => s.items.length > 0)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {sections.map(s => (
        <div key={s.title} className="card-medical p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            {s.title}
          </p>
          <ul className="space-y-1">
            {s.items.map((item, i) => (
              <li key={i} className="text-sm text-foreground">{item}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
