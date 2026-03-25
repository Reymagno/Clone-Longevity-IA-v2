'use client'

import { useState, useEffect } from 'react'
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
import { ExportButtons } from './ExportButtons'
import { LongevityChat } from './LongevityChat'
import type { Patient, LabResult } from '@/types'
import {
  BarChart2, Shield, Activity, FlaskConical,
  TrendingUp, ClipboardList, ArrowLeft, HeartPulse, ScanSearch, Dna
} from 'lucide-react'
import Link from 'next/link'

interface DashboardTabsProps {
  patient: Patient
  result: LabResult
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
]

export function DashboardTabs({ patient, result }: DashboardTabsProps) {
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

  if (!analysis || !parsedData) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        Este resultado no tiene análisis disponible.
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header del Dashboard */}
      <div className="sticky top-0 z-40 bg-card/95 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Fila superior */}
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-4">
              <Link href="/patients" className="text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft size={18} />
              </Link>
              <div>
                <p className="font-semibold text-foreground">{patient.name}</p>
                <p className="text-xs text-muted-foreground font-mono">
                  {patient.code} · {patient.age} años · {new Date(result.result_date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
              </div>
            </div>
            <ExportButtons patientName={patient.name} activeTab={activeTab} />
          </div>

          {/* Tabs */}
          <div className="flex overflow-x-auto scrollbar-none -mb-px">
            {TABS.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-all ${
                    activeTab === tab.id
                      ? 'border-accent text-accent'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                  }`}
                >
                  <Icon size={15} />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

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
      </div>
    </div>
  )
}
