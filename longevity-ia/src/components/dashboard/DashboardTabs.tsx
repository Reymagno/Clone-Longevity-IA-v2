'use client'

import { useState } from 'react'
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
import { ExportButtons } from './ExportButtons'
import { LongevityChat } from './LongevityChat'
import type { Patient, LabResult } from '@/types'
import {
  BarChart2, Shield, Activity, FlaskConical,
  TrendingUp, ClipboardList, ArrowLeft, HeartPulse, ScanSearch, Dna, Upload, ChevronDown, FileText
} from 'lucide-react'
import Link from 'next/link'

interface ResultSummary {
  id: string
  result_date: string
}

interface DashboardTabsProps {
  patient: Patient
  result: LabResult
  allResults?: ResultSummary[]
}

const TABS = [
  { id: 0, label: 'Resumen', icon: BarChart2 },
  { id: 1, label: 'FODA Médica', icon: Shield },
  { id: 2, label: 'Lípidos', icon: Activity },
  { id: 3, label: 'Metabólico', icon: FlaskConical },
  { id: 4, label: 'Proyección', icon: TrendingUp },
  { id: 5, label: 'Protocolo', icon: ClipboardList },
  { id: 6, label: 'Órganos', icon: HeartPulse },
  { id: 7, label: 'Estudio', icon: ScanSearch },
  { id: 8, label: 'Células Madre', icon: Dna },
  { id: 9, label: 'Historia Clínica', icon: FileText },
]

function formatResultDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function DashboardTabs({ patient, result, allResults = [] }: DashboardTabsProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState(() => {
    const tab = searchParams.get('tab')
    const parsed = tab ? parseInt(tab) : 0
    return isNaN(parsed) ? 0 : Math.min(Math.max(parsed, 0), TABS.length - 1)
  })

  const analysis = result.ai_analysis
  const parsedData = result.parsed_data

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
    <div className="sticky top-0 z-40 bg-card/95 backdrop-blur border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center">
                <Dna size={15} className="text-background" />
              </div>
              <span className="hidden sm:block font-semibold text-foreground text-sm">Longevity IA</span>
            </Link>
            <span className="text-border hidden sm:block">|</span>
            <Link href="/patients" className="text-muted-foreground hover:text-foreground transition-colors" title="Mis pacientes">
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
                      {formatResultDate(r.result_date)}
                    </option>
                  ))}
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
            )}

            {/* Fecha actual (un solo análisis) */}
            {allResults.length <= 1 && (
              <span className="hidden sm:block text-xs text-muted-foreground">
                {formatResultDate(result.result_date)}
              </span>
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
              const showDot = tab.id === 9 && !patient.clinical_history
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`relative flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-all ${
                    activeTab === tab.id
                      ? 'border-accent text-accent'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                  }`}
                >
                  <Icon size={15} />
                  {tab.label}
                  {showDot && (
                    <span className="w-1.5 h-1.5 rounded-full bg-warning inline-block ml-0.5" />
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
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center px-4">
          <p className="text-muted-foreground">Este resultado no tiene análisis disponible.</p>
          {allResults.length > 1 && (
            <p className="text-sm text-muted-foreground">
              Selecciona otro análisis en el menú de fechas de arriba.
            </p>
          )}
          <Link
            href={`/patients/${patient.id}/upload`}
            className="flex items-center gap-2 px-4 py-2 bg-accent text-background text-sm font-medium rounded-lg hover:bg-accent/90 transition-colors"
          >
            <Upload size={14} />
            Realizar nuevo análisis
          </Link>
        </div>
      </div>
    )
  }

  // ── Dashboard completo ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      {Header}

      {/* Chat flotante */}
      <LongevityChat patient={patient} analysis={analysis} />

      {/* Contenido */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6" id="dashboard-export">
        {activeTab === 0 && (
          <SummaryTab
            analysis={analysis}
            patientAge={patient.age}
            patientName={patient.name}
            resultDate={result.result_date}
            parsedData={parsedData}
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
          <FilesTab
            fileUrls={result.file_urls}
            patientName={patient.name}
            resultDate={result.result_date}
          />
        )}
        {activeTab === 8 && (
          <StemCellTab
            patient={patient}
            parsedData={parsedData}
            analysis={analysis}
          />
        )}
        {activeTab === 9 && (
          <ClinicalHistoryTab
            patient={patient}
            result={result}
          />
        )}
      </div>
    </div>
  )
}
