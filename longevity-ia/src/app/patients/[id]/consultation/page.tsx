'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { ConsultationRecorder } from '@/components/consultation/ConsultationRecorder'
import { ConsultationHistory } from '@/components/consultation/ConsultationHistory'
import { ConsultationDetail } from '@/components/consultation/ConsultationDetail'
import type { Patient, Consultation } from '@/types'
import { ArrowLeft, Stethoscope } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { LogoIcon } from '@/components/ui/logo-icon'

export default function ConsultationPage() {
  const params = useParams()
  const router = useRouter()
  const patientId = params.id as string

  const [patient, setPatient] = useState<Patient | null>(null)
  const [consultations, setConsultations] = useState<Consultation[]>([])
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null)
  const [loading, setLoading] = useState(true)
  const [medicoName, setMedicoName] = useState<string>('')

  // Load patient + consultations + medico info
  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/login'); return }

        // Verify medico role
        const role = user.app_metadata?.role ?? user.user_metadata?.role
        if (role !== 'medico') { router.push('/patients'); return }

        // Load medico name
        const { data: medicoData } = await supabase
          .from('medicos')
          .select('full_name')
          .eq('user_id', user.id)
          .maybeSingle()
        if (medicoData) setMedicoName(medicoData.full_name)

        // Load patient
        const { data: p } = await supabase
          .from('patients')
          .select('*')
          .eq('id', patientId)
          .single()
        if (!p) { toast.error('Paciente no encontrado'); router.push('/patients'); return }
        setPatient(p)

        // Load consultations
        await fetchConsultations()
      } catch {
        toast.error('Error al cargar datos')
      } finally {
        setLoading(false)
      }
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId])

  const fetchConsultations = useCallback(async () => {
    try {
      const res = await fetch(`/api/consultations?patientId=${patientId}`)
      if (res.ok) {
        const data = await res.json()
        const list = data.consultations || []
        // DEBUG: ver qué datos tienen las consultas
        list.forEach((c: Consultation, i: number) => {
          console.log(`[Consultation ${i}] id=${c.id}, ai_soap keys:`, c.ai_soap ? Object.keys(c.ai_soap) : 'null', 'ai_summary:', !!c.ai_summary, 'tags:', c.tags)
        })
        setConsultations(list)
      }
    } catch {
      // silent
    }
  }, [patientId])

  function handleSaved(c: Consultation) {
    setConsultations(prev => [c, ...prev])
    toast.success('Consulta guardada correctamente')
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/consultations?consultationId=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setConsultations(prev => prev.filter(c => c.id !== id))
      if (selectedConsultation?.id === id) setSelectedConsultation(null)
      toast.success('Consulta eliminada')
    } catch {
      toast.error('Error al eliminar consulta')
    }
  }

  async function handleDownloadPDF(c: Consultation) {
    try {
      const { generateConsultationPDF } = await import('@/lib/consultation-pdf')
      await generateConsultationPDF(patient!, c, medicoName)
      toast.success('PDF generado')
    } catch {
      toast.error('Error al generar PDF')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!patient) return null

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/40 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/patients"
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted/30 transition-colors"
            >
              <ArrowLeft size={16} className="text-muted-foreground" />
            </Link>
            <div className="flex items-center gap-2">
              <LogoIcon size={24} />
              <div>
                <h1 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <Stethoscope size={14} className="text-accent" />
                  Consulta Medica
                </h1>
                <p className="text-[10px] text-muted-foreground">
                  {patient.name} · {patient.age} anos · {patient.code}
                </p>
              </div>
            </div>
          </div>

          {medicoName && (
            <p className="text-[10px] text-muted-foreground hidden sm:block">
              Dr. {medicoName}
            </p>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-10">

        {/* Recorder section */}
        <section className="flex flex-col items-center">
          <ConsultationRecorder
            patientId={patientId}
            onSaved={handleSaved}
          />
        </section>

        {/* History section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Stethoscope size={14} className="text-accent" />
              Historial de Consultas
              {consultations.length > 0 && (
                <span className="text-[10px] font-normal text-muted-foreground ml-1">
                  ({consultations.length})
                </span>
              )}
            </h2>
          </div>

          <ConsultationHistory
            consultations={consultations}
            onSelect={setSelectedConsultation}
            onDelete={handleDelete}
            onDownloadPDF={handleDownloadPDF}
          />
        </section>
      </div>

      {/* Detail modal */}
      {selectedConsultation && (
        <ConsultationDetail
          consultation={selectedConsultation}
          patient={patient}
          onClose={() => setSelectedConsultation(null)}
          medicoName={medicoName}
        />
      )}
    </div>
  )
}
