'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { formatDate, formatDateFull, getScoreColor, getScoreLabel } from '@/lib/utils'
import type { Patient, LabResult } from '@/types'
import {
  Calendar, BarChart2, Upload, FlaskConical,
  Activity, TrendingUp, ArrowRight, FileText, Shield,
} from 'lucide-react'

interface AnalysisCardsProps {
  patient: Patient
}

interface AnalysisResult {
  id: string
  result_date: string
  created_at: string
  ai_analysis: { overallScore?: number; longevity_age?: number; clinicalSummary?: string } | null
  parsed_data: Record<string, unknown> | null
  file_urls: string[]
}

function countBiomarkers(parsed: Record<string, unknown> | null): number {
  if (!parsed) return 0
  let count = 0
  for (const section of Object.values(parsed)) {
    if (section && typeof section === 'object' && !Array.isArray(section)) {
      for (const val of Object.values(section as Record<string, unknown>)) {
        if (val && typeof val === 'object' && (val as Record<string, unknown>).value != null) count++
      }
    }
  }
  return count
}

export function AnalysisCards({ patient }: AnalysisCardsProps) {
  const [results, setResults] = useState<AnalysisResult[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('lab_results')
      .select('id, result_date, created_at, ai_analysis, parsed_data, file_urls')
      .eq('patient_id', patient.id)
      .order('result_date', { ascending: false })
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setResults((data as AnalysisResult[]) ?? [])
        setLoading(false)
      })
  }, [patient.id])

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="card-medical p-6">
            <div className="h-5 w-32 shimmer rounded mb-3" />
            <div className="h-16 shimmer rounded-xl mb-4" />
            <div className="h-4 w-full shimmer rounded mb-2" />
            <div className="h-4 w-3/4 shimmer rounded" />
          </div>
        ))}
      </div>
    )
  }

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-accent/15 to-accent/5 border border-accent/20 flex items-center justify-center mb-6 animate-float">
          <FlaskConical size={36} className="text-accent" />
        </div>
        <h3 className="text-xl font-bold text-foreground mb-2">Comienza tu viaje de longevidad</h3>
        <p className="text-muted-foreground max-w-md mb-6 leading-relaxed">
          Sube tu primer estudio de laboratorio. La IA analizará cada biomarcador y generará tu perfil de salud personalizado.
        </p>
        <div className="flex items-center gap-1.5 mb-8 text-[11px] text-muted-foreground/60">
          <Shield size={12} />
          <span>Tus datos son privados y protegidos</span>
        </div>
        <Link
          href={`/patients/${patient.id}/upload`}
          className="inline-flex items-center gap-2 bg-accent text-background px-8 py-3.5 rounded-xl text-base font-semibold hover:bg-accent/90 transition-all shadow-accent/20 shadow-lg"
        >
          <Upload size={18} />
          Subir Estudio
        </Link>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 animate-fade-in">
      {results.map((r, i) => {
        const score = r.ai_analysis?.overallScore ?? null
        const bioAge = r.ai_analysis?.longevity_age ?? null
        const summary = r.ai_analysis?.clinicalSummary ?? null
        const biomarkerCount = countBiomarkers(r.parsed_data)
        const hasAnalysis = !!r.ai_analysis
        const scoreColor = score !== null ? getScoreColor(score) : '#6B6660'

        return (
          <Link
            key={r.id}
            href={`/patients/${patient.id}/dashboard?resultId=${r.id}`}
            className={`group card-medical p-0 overflow-hidden hover-lift transition-all duration-300 animate-slide-up relative${i === 0 ? ' ring-1 ring-accent/20' : ''}`}
            style={{ animationDelay: `${i * 0.06}s`, animationFillMode: 'both' }}
          >
            {/* Top color bar */}
            <div className="h-1.5" style={{ background: scoreColor }} />

            {i === 0 && (
              <span className="absolute top-3.5 right-3 inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-semibold bg-accent/10 text-accent border border-accent/20">
                Último análisis
              </span>
            )}

            <div className="p-5">
              {/* Date header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-muted/50 border border-border/50">
                    <Calendar size={14} className="text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">{formatDateFull(r.result_date)}</p>
                    <p className="text-[10px] text-muted-foreground">Subido {formatDate(r.created_at)}</p>
                  </div>
                </div>
                <ArrowRight size={14} className="text-muted-foreground group-hover:text-accent group-hover:translate-x-1 transition-all" />
              </div>

              {/* Score block */}
              {hasAnalysis && score !== null ? (
                <div className="flex items-center gap-4 p-3 rounded-xl mb-4"
                  style={{ background: `${scoreColor}10`, border: `1px solid ${scoreColor}25` }}>
                  <div className="flex flex-col items-center">
                    <span className="text-3xl font-mono font-bold leading-none" style={{ color: scoreColor }}>
                      {Math.round(score)}
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-wider mt-1" style={{ color: scoreColor }}>
                      {getScoreLabel(score)}
                    </span>
                  </div>
                  <div className="h-10 w-px bg-border/40" />
                  <div className="flex-1 min-w-0">
                    {bioAge !== null && (
                      <p className="text-xs text-muted-foreground">
                        Edad biologica: <span className="text-foreground font-semibold">{bioAge} anos</span>
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {biomarkerCount} biomarcadores
                    </p>
                  </div>
                </div>
              ) : !hasAnalysis && biomarkerCount > 0 ? (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-warning/8 border border-warning/20 mb-4">
                  <Activity size={16} className="text-warning shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-warning">Datos extraidos, sin analisis IA</p>
                    <p className="text-[10px] text-muted-foreground">{biomarkerCount} biomarcadores · Usa "Re-analizar" en el dashboard</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/40 mb-4">
                  <BarChart2 size={16} className="text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Sin analisis disponible</p>
                </div>
              )}

              {/* Alert preview badges */}
              {(r.ai_analysis as any)?.keyAlerts && (r.ai_analysis as any).keyAlerts.filter((a: any) => a.level === 'danger' || a.level === 'warning').length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {(r.ai_analysis as any).keyAlerts
                    .filter((a: any) => a.level === 'danger' || a.level === 'warning')
                    .slice(0, 3)
                    .map((alert: any, j: number) => (
                      <span
                        key={j}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          alert.level === 'danger'
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {alert.title}
                      </span>
                    ))}
                </div>
              )}

              {/* System scores mini-bars */}
              {(r.ai_analysis as any)?.systemScores && (
                <div className="grid grid-cols-4 gap-1.5 mb-3">
                  {['cardiovascular', 'metabolic', 'hepatic', 'renal'].map(key => {
                    const val = (r.ai_analysis as any)?.systemScores?.[key] ?? 0
                    return (
                      <div key={key} className="text-center">
                        <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden mb-1">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${Math.min(val, 100)}%`,
                              background: val >= 80 ? '#2EAE7B' : val >= 60 ? '#D4A03A' : '#D4536A'
                            }}
                          />
                        </div>
                        <p className="text-[8px] text-muted-foreground capitalize truncate">
                          {key === 'cardiovascular' ? 'Cardio' : key === 'metabolic' ? 'Metab' : key === 'hepatic' ? 'Hepát' : 'Renal'}
                        </p>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Summary preview */}
              {summary && (
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{summary}</p>
              )}

              {/* Bottom stats */}
              <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border/40">
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <FileText size={10} />
                  {r.file_urls?.length ?? 0} archivo{(r.file_urls?.length ?? 0) !== 1 ? 's' : ''}
                </div>
                {hasAnalysis && (
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <TrendingUp size={10} />
                    Analisis completo
                  </div>
                )}
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
