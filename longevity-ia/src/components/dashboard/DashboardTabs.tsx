'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { SummaryTab } from './tabs/SummaryTab'
import { SwotTab } from './tabs/SwotTab'
import { LipidsTab } from './tabs/LipidsTab'
import { MetabolicTab } from './tabs/MetabolicTab'
import { ProjectionTab } from './tabs/ProjectionTab'
import { ProtocolTab } from './tabs/ProtocolTab'
import { OrganHealthTab } from './tabs/OrganHealthTab'
import { FilesTab } from './tabs/FilesTab'
import { StemCellTab } from './tabs/StemCellTab'
import { ClinicalHistoryTab } from './tabs/ClinicalHistoryTab'
import { CompareTab } from './tabs/CompareTab'
import { TrendsTab } from './tabs/TrendsTab'
import { PeptidesTab } from './tabs/PeptidesTab'
import { ExportButtons } from './ExportButtons'
import { LongevityChat } from './LongevityChat'
import { InstantDashboard } from './InstantDashboard'
import type { Patient, LabResult } from '@/types'
import { toast } from 'sonner'
import {
  BarChart2, Shield, Activity, FlaskConical,
  TrendingUp, ClipboardList, ArrowLeft, HeartPulse, ScanSearch, Upload, ChevronDown, FileText,
  GitCompareArrows, RefreshCw, Trash2, LineChart, Dna
} from 'lucide-react'
import Link from 'next/link'
import { formatDate, hashString } from '@/lib/utils'
import { LogoIcon } from '@/components/ui/logo-icon'

interface ResultSummary {
  id: string
  result_date: string
}

interface DashboardTabsProps {
  patient: Patient
  result: LabResult
  allResults?: ResultSummary[]
  viewerRole?: string
}

// Tabs desactivadas temporalmente: Lípidos (2), Metabólico (3), Productos y suplementos (8)
const HIDDEN_TABS = new Set([2, 3, 8])

const TABS = [
  { id: 0, label: 'Resumen', icon: BarChart2 },
  { id: 1, label: 'FODA Médica', icon: Shield },
  // { id: 2, label: 'Lípidos', icon: Activity },        — desactivada
  // { id: 3, label: 'Metabólico', icon: FlaskConical },  — desactivada
  { id: 4, label: 'Proyección', icon: TrendingUp },
  { id: 5, label: 'Órganos', icon: HeartPulse },
  { id: 6, label: 'Protocolo', icon: ClipboardList },
  { id: 7, label: 'Células Madre', icon: HeartPulse },
  { id: 8, label: 'Productos y suplementos', icon: Dna },
  { id: 9, label: 'Historia Clínica', icon: FileText },
  { id: 10, label: 'Comparar', icon: GitCompareArrows },
  { id: 11, label: 'Estudio', icon: ScanSearch },
  { id: 12, label: 'Tendencias', icon: LineChart },
]

export function DashboardTabs({ patient, result, allResults = [], viewerRole = 'paciente' }: DashboardTabsProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState(() => {
    const tab = searchParams.get('tab')
    const parsed = tab ? parseInt(tab) : 0
    return isNaN(parsed) ? 0 : Math.min(Math.max(parsed, 0), TABS.length - 1)
  })

  const [isReanalyzing, setIsReanalyzing] = useState(false)
  const [clinicalHistoryChanged, setClinicalHistoryChanged] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  // Detect if medico owns this patient (full access) vs linked (limited)
  useEffect(() => {
    if (viewerRole === 'medico') {
      import('@/lib/supabase/client').then(({ supabase }) => {
        supabase.auth.getUser().then(({ data: { user } }) => setCurrentUserId(user?.id ?? null))
      })
    }
  }, [viewerRole])

  const isOwnPatient = viewerRole === 'paciente' || (viewerRole === 'medico' && currentUserId === patient.user_id)

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const analysis = result.ai_analysis
  const parsedData = result.parsed_data

  // Detectar si la historia clínica cambió desde el último análisis
  useEffect(() => {
    async function checkClinicalChange() {
      if (!analysis) { setClinicalHistoryChanged(false); return }

      const meta = (analysis as unknown as Record<string, unknown>)?._meta as { clinicalHistoryHash?: string } | undefined
      const savedHash = meta?.clinicalHistoryHash

      if (!savedHash) {
        // Sin hash guardado — el análisis ya existe, no hay razón para regenerar
        setClinicalHistoryChanged(false)
        return
      }

      const currentHash = await hashString(JSON.stringify(patient.clinical_history ?? null))
      setClinicalHistoryChanged(currentHash !== savedHash)
    }
    checkClinicalChange()
  }, [analysis, patient.clinical_history])

  const handleReanalyze = useCallback(async () => {
    if (isReanalyzing) return
    setIsReanalyzing(true)
    try {
      const res = await fetch(`/api/results/${result.id}/reanalyze`, { method: 'POST' })
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (value) buffer += decoder.decode(value, { stream: !done })
        const lines = buffer.split('\n')
        buffer = done ? '' : (lines.pop() ?? '')
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const event = JSON.parse(line.slice(6))
            if (!event.ok) {
              toast.error(event.error || 'Error en re-análisis')
              return
            }
            if (event.step === 'done') {
              toast.success('Re-análisis completado')
              router.refresh()
              window.location.reload()
            }
          } catch {
            // Línea SSE no parseable — ignorar keepalives
          }
        }
        if (done) break
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error en re-análisis')
    } finally {
      setIsReanalyzing(false)
    }
  }, [isReanalyzing, result.id, router])

  function handleTabChange(tabId: number) {
    setActiveTab(tabId)
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', tabId.toString())
    router.replace(`?${params.toString()}`, { scroll: false })
  }

  function handleResultChange(resultId: string) {
    const params = new URLSearchParams()
    params.set('resultId', resultId)
    router.push(`/patients/${patient.id}/dashboard?${params.toString()}`)
  }

  const handleDeleteResult = useCallback(async () => {
    if (isDeleting) return
    setIsDeleting(true)
    try {
      const { supabase } = await import('@/lib/supabase/client')

      // Eliminar archivos del storage
      const fileUrls: string[] = result.file_urls ?? []
      if (fileUrls.length > 0) {
        const paths = fileUrls
          .map((url: string) => {
            const marker = '/lab-files/'
            const idx = url.indexOf(marker)
            return idx !== -1 ? decodeURIComponent(url.slice(idx + marker.length)) : null
          })
          .filter(Boolean) as string[]

        if (paths.length > 0) {
          await supabase.storage.from('lab-files').remove(paths)
        }
      }

      // Eliminar registro
      const { error } = await supabase
        .from('lab_results')
        .delete()
        .eq('id', result.id)

      if (error) throw new Error(error.message)

      toast.success('Análisis eliminado')
      setShowDeleteConfirm(false)

      // Si hay otros análisis, navegar al más reciente; si no, volver a upload
      const remaining = allResults.filter(r => r.id !== result.id)
      if (remaining.length > 0) {
        router.push(`/patients/${patient.id}/dashboard?resultId=${remaining[0].id}`)
      } else {
        router.push(`/patients/${patient.id}/upload`)
      }
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar análisis')
    } finally {
      setIsDeleting(false)
    }
  }, [isDeleting, result.id, allResults, patient.id, router])

  // ── Header compartido ───────────────────────────────────────────────────────
  const Header = (
    <div className="sticky top-0 z-40 bg-card/90 backdrop-blur-xl border-b border-border/60 header-scan">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <span className={analysis ? 'ai-active' : ''}><LogoIcon size={32} /></span>
              <div className="hidden sm:block">
                <span className="font-semibold text-foreground text-sm tracking-tight block">Longevity IA</span>
                <span className="text-[8px] text-muted-foreground/40 leading-none">Derechos reservados - Longevity Clinic SA de CV</span>
              </div>
            </Link>
            <span className="text-border/50 hidden sm:block">|</span>
            <Link href="/patients" className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-white/5" title="Mis pacientes">
              <ArrowLeft size={17} />
            </Link>
            <div>
              <p className="font-semibold text-foreground">{patient.name}</p>
              <p className="text-xs text-muted-foreground font-mono">
                {viewerRole !== 'paciente' && <>{patient.code} · </>}{patient.age} años
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Selector de análisis por fecha */}
            {allResults.length > 1 && (
              <div className="relative">
                <select
                  value={result.id}
                  onChange={(e) => handleResultChange(e.target.value)}
                  className="appearance-none bg-muted border border-border rounded-lg pl-3 pr-8 py-1.5 text-sm text-foreground focus:outline-none focus:border-accent transition-colors cursor-pointer"
                >
                  {allResults.map((r) => (
                    <option key={r.id} value={r.id}>
                      {formatDate(r.result_date)}
                    </option>
                  ))}
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
            )}

            {/* Fecha actual (un solo análisis) */}
            {allResults.length <= 1 && (
              <span className="hidden sm:block text-xs text-muted-foreground">
                {formatDate(result.result_date)}
              </span>
            )}

            {/* Botón eliminar análisis actual */}
            {isOwnPatient && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium border border-border/30 rounded-lg text-muted-foreground/50 hover:text-danger hover:border-danger/30 hover:bg-danger/5 transition-all"
                title="Eliminar este análisis"
              >
                <Trash2 size={13} />
              </button>
            )}

            {/* Botón re-análisis — pacientes y médicos con pacientes propios */}
            {isOwnPatient && analysis && (
              <button
                onClick={handleReanalyze}
                disabled={isReanalyzing || !clinicalHistoryChanged}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border rounded-lg transition-all disabled:cursor-not-allowed ${
                  clinicalHistoryChanged
                    ? 'border-accent/30 text-accent hover:bg-accent/10 disabled:opacity-50'
                    : 'border-border/30 text-muted-foreground/40 opacity-40'
                }`}
                title={clinicalHistoryChanged ? 'Re-analizar con historia clínica actualizada' : 'La historia clínica no ha cambiado desde el último análisis'}
              >
                <RefreshCw size={13} className={isReanalyzing ? 'animate-spin' : ''} />
                <span className="hidden sm:inline">{isReanalyzing ? 'Re-analizando...' : 'Re-analizar'}</span>
              </button>
            )}

            {isOwnPatient && (
            <Link
              href={`/patients/${patient.id}/upload`}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-border rounded-lg text-muted-foreground hover:text-foreground hover:border-accent/50 hover:bg-muted/30 transition-all"
            >
              <Upload size={13} />
              <span className="hidden sm:inline">Nuevo Análisis</span>
            </Link>
            )}

            {analysis && parsedData && (
              <ExportButtons
                patientName={patient.name}
                activeTab={activeTab}
                patient={patient}
                parsedData={parsedData}
                analysis={analysis}
                resultDate={result.result_date}
              />
            )}
          </div>
        </div>

        {/* Tabs — solo si hay análisis */}
        {analysis && parsedData && (
          <div className="flex overflow-x-auto scrollbar-none -mb-px">
            {TABS.filter(tab => {
              // Hide Historia Clínica for linked medico patients
              if (viewerRole === 'medico' && !isOwnPatient && tab.id === 9) return false
              // Comparar oculta para médicos
              if (tab.id === 10 && viewerRole === 'medico') return false
              // Tendencias only for medicos
              if (tab.id === 12 && viewerRole !== 'medico') return false
              // Protocolo oculto para pacientes
              if (tab.id === 6 && viewerRole === 'paciente') return false
              return true
            }).map((tab) => {
              const Icon = tab.icon
              const showDot = tab.id === 9 && !patient.clinical_history
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`relative flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-all ${
                    activeTab === tab.id
                      ? 'border-accent text-accent'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border/60'
                  }`}
                >
                  <Icon size={14} className={activeTab === tab.id ? 'text-accent' : ''} />
                  <span className="text-[13px]">{tab.label}</span>
                  {showDot && (
                    <span className="w-1.5 h-1.5 rounded-full bg-warning inline-block ml-0.5 animate-breathe" />
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )

  // ── parsedData sin análisis IA → Dashboard Instantáneo ──────────────────────
  if (!analysis && parsedData) {
    return (
      <InstantDashboard
        patient={patient}
        result={result}
        allResults={allResults}
        viewerRole={viewerRole}
      />
    )
  }

  // ── Sin datos disponibles ─────────────────────────────────────────────────
  if (!analysis || !parsedData) {
    return (
      <div className="min-h-screen bg-background">
        {Header}
        <div className="flex flex-col items-center justify-center py-24 gap-6 text-center px-4 animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-muted/30 border border-border flex items-center justify-center">
            <BarChart2 size={28} className="text-muted-foreground" />
          </div>
          <div>
            <p className="text-foreground font-semibold mb-1">Este resultado no tiene analisis disponible.</p>
            {allResults.length > 1 && (
              <p className="text-sm text-muted-foreground">
                Selecciona otro analisis en el menu de fechas de arriba.
              </p>
            )}
          </div>
          <Link
            href={`/patients/${patient.id}/upload`}
            className="flex items-center gap-2 px-5 py-2.5 bg-accent text-background text-sm font-medium rounded-xl hover:bg-accent/90 transition-all shadow-accent/20 shadow-lg"
          >
            <Upload size={14} />
            Realizar nuevo analisis
          </Link>
        </div>
      </div>
    )
  }

  // ── Dashboard completo ──────────────────────────────────────────────────────
  return (
    <div className={`min-h-screen hero-gradient vignette ${isReanalyzing ? 'reanalyzing-bar' : ''}`}>
      {Header}

      {/* Chat flotante — pacientes y médicos */}
      {(viewerRole === 'paciente' || viewerRole === 'medico') && (
        <LongevityChat patient={patient} analysis={analysis} resultId={result.id} />
      )}

      {/* Contenido */}
      <div key={activeTab} className="max-w-7xl mx-auto px-4 sm:px-6 py-6 animate-reveal-panel" id="dashboard-export">
        {activeTab === 0 && (
          <SummaryTab
            analysis={analysis}
            patientAge={patient.age}
            patientName={patient.name}
            resultDate={result.result_date}
            parsedData={parsedData}
            patient={patient}
            viewerRole={viewerRole}
            resultId={result.id}
          />
        )}
        {activeTab === 1 && (
          <SwotTab analysis={analysis} />
        )}
        {/* Lípidos (id:2) — desactivada temporalmente
        {activeTab === 2 && parsedData.lipids && (
          <LipidsTab lipids={parsedData.lipids} />
        )}
        {activeTab === 2 && !parsedData.lipids && (
          <div className="text-center py-20 text-muted-foreground">No hay datos lipídicos en este estudio</div>
        )}
        */}
        {/* Metabólico (id:3) — desactivada temporalmente
        {activeTab === 3 && (
          <MetabolicTab parsedData={parsedData} />
        )}
        */}
        {activeTab === 4 && (
          <ProjectionTab analysis={analysis} />
        )}
        {activeTab === 5 && (
          <OrganHealthTab parsedData={parsedData} analysis={analysis} />
        )}
        {activeTab === 6 && (
          <ProtocolTab protocol={analysis.protocol} viewerRole={viewerRole} patient={patient} />
        )}
        {activeTab === 7 && (
          <StemCellTab
            patient={patient}
            parsedData={parsedData}
            analysis={analysis}
          />
        )}
        {activeTab === 8 && parsedData && (
          <PeptidesTab
            patient={patient}
            parsedData={parsedData}
            analysis={analysis}
          />
        )}
        {activeTab === 9 && isOwnPatient && (
          <ClinicalHistoryTab
            patient={patient}
            result={result}
            viewerRole={viewerRole}
          />
        )}
        {/* Comparar — oculta para médicos */}
        {activeTab === 10 && viewerRole !== 'medico' && (
          <CompareTab
            patient={patient}
            currentResult={result}
            allResults={allResults}
          />
        )}
        {activeTab === 11 && (
          <FilesTab
            fileUrls={result.file_urls}
            patientName={patient.name}
            resultDate={result.result_date}
          />
        )}
        {activeTab === 12 && viewerRole === 'medico' && (
          <TrendsTab
            patient={patient}
            allResults={allResults}
          />
        )}
      </div>

      {/* Modal confirmación eliminar análisis */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => !isDeleting && setShowDeleteConfirm(false)}
          />
          <div className="relative bg-card border border-border rounded-2xl w-full max-w-sm animate-slide-up p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-danger/10 border border-danger/20 flex items-center justify-center">
                <Trash2 size={18} className="text-danger" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Eliminar análisis</h3>
                <p className="text-xs text-muted-foreground">{formatDate(result.result_date)}</p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              Se eliminará permanentemente este análisis, incluyendo los archivos de laboratorio y el reporte de IA.
              {allResults.length > 1
                ? ' Los demás análisis del paciente no se verán afectados.'
                : ' Este es el único análisis del paciente.'}
            </p>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="flex-1 py-2 text-sm font-medium border border-border rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-all disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteResult}
                disabled={isDeleting}
                className="flex-1 py-2 text-sm font-medium bg-danger text-white rounded-lg hover:bg-danger/90 transition-all disabled:opacity-50"
              >
                {isDeleting ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
