'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, ClipboardList, CheckCircle2, RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import type { Patient, ClinicalHistory } from '@/types'
import { PatientIntakeChat } from '@/components/patients/PatientIntakeChat'

export default function IntakePage({ params }: { params: { id: string } }) {
  const [patient, setPatient] = useState<Patient | null>(null)
  const [loading, setLoading] = useState(true)
  const [showChat, setShowChat] = useState(false)
  const [justCompleted, setJustCompleted] = useState(false)

  function loadPatient() {
    supabase.from('patients').select('*').eq('id', params.id).single()
      .then(({ data }) => {
        setPatient(data)
        setLoading(false)
        if (!data?.clinical_history) setShowChat(true)
      })
  }

  useEffect(() => { loadPatient() }, [params.id]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleComplete() {
    setJustCompleted(true)
    setShowChat(false)
    loadPatient()
  }

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <span className="w-6 h-6 rounded-full border-2 border-accent/30 border-t-accent animate-spin" />
    </div>
  )

  if (!patient) return (
    <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">
      Paciente no encontrado.
    </div>
  )

  const hasHistory = !!patient.clinical_history

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <Link href="/patients" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center">
              <ClipboardList size={16} className="text-background" />
            </div>
            <div>
              <span className="font-semibold text-foreground">{patient.name}</span>
              <span className="text-muted-foreground"> — Historia Clínica</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">

        {/* Historial ya existe y no está en modo edición */}
        {hasHistory && !showChat ? (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center">
                <CheckCircle2 size={18} className="text-accent" />
              </div>
              <div>
                <p className="font-semibold text-foreground">
                  {justCompleted ? '¡Historia Clínica guardada!' : 'Historia Clínica Completada'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Guardada el {new Date(patient.clinical_history!.completed_at).toLocaleDateString('es-MX', {
                    day: '2-digit', month: 'long', year: 'numeric'
                  })}
                </p>
              </div>
            </div>

            <HistorySummary history={patient.clinical_history!} />

            <button
              onClick={() => { setShowChat(true); setJustCompleted(false) }}
              className="flex items-center gap-2 text-sm text-muted-foreground border border-border px-4 py-2 rounded-lg hover:text-foreground hover:border-accent/50 transition-colors"
            >
              <RefreshCw size={14} />
              Actualizar historial
            </button>
          </div>

        ) : (
          /* Chat de intake */
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-1">Historia Clínica</h1>
              <p className="text-sm text-muted-foreground">
                Un asistente conversacional recopilará tu información de salud en aproximadamente 5 minutos.
              </p>
            </div>

            <PatientIntakeChat
              patientId={params.id}
              patientName={patient.name}
              onComplete={handleComplete}
            />
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Resumen visual del historial ─────────────────────────────────────────────

function HistorySummary({ history }: { history: ClinicalHistory }) {
  const sections = [
    {
      title: 'Datos Antropométricos',
      items: [
        history.anthropometric.waist_cm != null && `Cintura: ${history.anthropometric.waist_cm} cm`,
        history.anthropometric.blood_pressure && `Presión arterial: ${history.anthropometric.blood_pressure} mmHg`,
      ].filter(Boolean) as string[],
    },
    {
      title: 'Alergias',
      items: [
        history.allergies.food && `Alimentaria: ${history.allergies.food}`,
        history.allergies.medication && `Medicamento: ${history.allergies.medication}`,
      ].filter(Boolean) as string[],
    },
    {
      title: 'Alimentación',
      items: [
        history.diet.type && `Tipo de dieta: ${history.diet.type}`,
        history.diet.meals_per_day && `Comidas al día: ${history.diet.meals_per_day}`,
        history.diet.alcohol && `Alcohol: ${history.diet.alcohol}`,
        history.diet.supplements && `Suplementos: ${history.diet.supplements}`,
      ].filter(Boolean) as string[],
    },
    {
      title: 'Estilo de Vida',
      items: [
        history.lifestyle.exercise && `Ejercicio: ${history.lifestyle.exercise}`,
        history.lifestyle.sleep_hours && `Sueño: ${history.lifestyle.sleep_hours}`,
        history.lifestyle.smoker && `Tabaco: ${history.lifestyle.smoker}`,
        history.lifestyle.stress_level && `Estrés: ${history.lifestyle.stress_level}`,
      ].filter(Boolean) as string[],
    },
    {
      title: 'Historial Familiar',
      items: [
        history.family_history.conditions.length > 0 && `Condiciones: ${history.family_history.conditions.join(', ')}`,
        history.family_history.details || '',
      ].filter(Boolean) as string[],
    },
    {
      title: 'Historial Reciente',
      items: [
        history.recent_illness.condition && `Condición: ${history.recent_illness.condition}`,
        history.recent_illness.treatment && `Tratamiento: ${history.recent_illness.treatment}`,
        history.recent_illness.current_medications && `Medicamentos actuales: ${history.recent_illness.current_medications}`,
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
