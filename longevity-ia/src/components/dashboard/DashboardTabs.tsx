'use client'

import { useState, useCallback } from 'react'
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
import { ExportButtons } from './ExportButtons'
import { LongevityChat } from './LongevityChat'
import type { Patient, LabResult } from '@/types'
import { toast } from 'sonner'
import {
  BarChart2, Shield, Activity, FlaskConical,
  TrendingUp, ClipboardList, ArrowLeft, HeartPulse, ScanSearch, Upload, ChevronDown, FileText,
  GitCompareArrows, RefreshCw
} from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
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

const TABS = [
  { id: 0, label: 'Resumen', icon: BarChart2 },
  { id: 1, label: 'FODA Médica', icon: Shield },
  { id: 2, label: 'Lípidos', icon: Activity },
  { id: 3, label: 'Metabólico', icon: FlaskConical },
  { id: 4, label: 'Proyección', icon: TrendingUp },
  { id: 5, label: 'Protocolo', icon: ClipboardList },
  { id: 6, label: 'Órganos', icon: HeartPulse },
  { id: 7, label: 'Comparar', icon: GitCompareArrows },
  { id: 8, label: 'Estudio', icon: ScanSearch },
  { id: 9, label: 'Células Madre', icon: HeartPulse },
  { id: 10, label: 'Historia Clínica', icon: FileText },
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

  const analysis = result.ai_analysis
  const parsedData = result.parsed_data

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
            if (!event.ok) throw new Error(event.error || 'Error')
            if (event.step === 'done') {
              toast.success('Re-análisis completado')
              router.refresh()
              window.location.reload()
            }
          } catch (e) {
            if (e instanceof Error && e.message !== 'Error') throw e
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

  // ── Header compartido ───────────────────────────────────────────────────────
  const Header = (
    <div className="sticky top-0 z-40 bg-card/90 backdrop-blur-xl border-b border-border/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <LogoIcon size={32} />
              <span className="hidden sm:block font-semibold text-foreground text-sm tracking-tight">Longevity IA</span>
            </Link>
            <span className="text-border/50 hidden sm:block">|</span>
            <Link href="/patients" className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-white/5" title="Mis pacientes">
              <ArrowLeft size={17} />
            </Link>
            <div>
              <p className="font-semibold text-foreground">{patient.name}</p>
              <p className="text-xs text-muted-foreground font-mono">
                {patient.code} · {patient.age} años
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

            {/* Botón re-análisis */}
            {analysis && (
              <button
                onClick={handleReanalyze}
                disabled={isReanalyzing}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-accent/30 rounded-lg text-accent hover:bg-accent/10 transition-all disabled:opacity-50"
                title="Re-analizar estudio con IA"
              >
                <RefreshCw size={13} className={isReanalyzing ? 'animate-spin' : ''} />
                <span className="hidden sm:inline">{isReanalyzing ? 'Re-analizando...' : 'Re-analizar'}</span>
              </button>
            )}

            <Link
              href={`/patients/${patient.id}/upload`}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-border rounded-lg text-muted-foreground hover:text-foreground hover:border-accent/50 hover:bg-muted/30 transition-all"
            >
              <Upload size={13} />
              <span className="hidden sm:inline">Nuevo Análisis</span>
            </Link>

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
            {TABS.map((tab) => {
              const Icon = tab.icon
              const showDot = tab.id === 10 && !patient.clinical_history
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

  // ── Sin análisis disponible ─────────────────────────────────────────────────
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
    <div className="min-h-screen bg-background">
      {Header}

      {/* Chat flotante — solo para pacientes */}
      {viewerRole === 'paciente' && (
        <LongevityChat patient={patient} analysis={analysis} resultId={result.id} />
      )}

      {/* Contenido */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6" id="dashboard-export">
        {activeTab === 0 && (
          <SummaryTab
            analysis={analysis}
            patientAge={patient.age}
            patientName={patient.name}
            resultDate={result.result_date}
            parsedData={parsedData}
            patient={patient}
          />
        )}
        {activeTab === 1 && (
          <SwotTab analysis={analysis} />
        )}
        {activeTab === 2 && parsedData.lipids && (
          <LipidsTab lipids={parsedData.lipids} />
        )}
        {activeTab === 2 && !parsedData.lipids && (
          <div className="text-center py-20 text-muted-foreground">No hay datos lipídicos en este estudio</div>
        )}
        {activeTab === 3 && (
          <MetabolicTab parsedData={parsedData} />
        )}
        {activeTab === 4 && (
          <ProjectionTab analysis={analysis} />
        )}
        {activeTab === 5 && (
          <ProtocolTab protocol={analysis.protocol} />
        )}
        {activeTab === 6 && (
          <OrganHealthTab parsedData={parsedData} analysis={analysis} />
        )}
        {activeTab === 7 && (
          <CompareTab
            patient={patient}
            currentResult={result}
            allResults={allResults}
          />
        )}
        {activeTab === 8 && (
          <FilesTab
            fileUrls={result.file_urls}
            patientName={patient.name}
            resultDate={result.result_date}
          />
        )}
        {activeTab === 9 && (
          <StemCellTab
            patient={patient}
            parsedData={parsedData}
            analysis={analysis}
          />
        )}
        {activeTab === 10 && (
          <ClinicalHistoryTab
            patient={patient}
            result={result}
          />
        )}
      </div>
    </div>
  )
}
