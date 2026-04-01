'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { Patient, LabResult, ParsedData, BiomarkerValue } from '@/types'
import { evaluateBiomarker, findBiomarker, type BiomarkerStatus } from '@/lib/biomarker-ranges'
import { supabase } from '@/lib/supabase/client'
import { LogoIcon } from '@/components/ui/logo-icon'
import Link from 'next/link'
import {
  ArrowLeft, Activity, FlaskConical, Droplets, Pill,
  Heart, Shield, Loader2, CheckCircle2, Sparkles, Trash2,
} from 'lucide-react'
import { toast } from 'sonner'

// ── Map ParsedData keys to catalog IDs ──────────────────────

interface FlatBiomarker {
  catalogId: string
  label: string
  category: string
  value: BiomarkerValue
}

function flattenParsedData(pd: ParsedData): FlatBiomarker[] {
  const result: FlatBiomarker[] = []

  const MAP: Record<string, { catalogId: string; label: string; category: string }> = {
    // Hematology
    'hematology.rbc': { catalogId: 'rbc', label: 'Eritrocitos', category: 'Hematología' },
    'hematology.hemoglobin': { catalogId: 'hemoglobin', label: 'Hemoglobina', category: 'Hematología' },
    'hematology.hematocrit': { catalogId: 'hematocrit', label: 'Hematocrito', category: 'Hematología' },
    'hematology.mcv': { catalogId: 'mcv', label: 'VCM', category: 'Hematología' },
    'hematology.mch': { catalogId: 'mch', label: 'HCM', category: 'Hematología' },
    'hematology.mchc': { catalogId: 'mchc', label: 'CMHC', category: 'Hematología' },
    'hematology.rdw': { catalogId: 'rdw', label: 'RDW', category: 'Hematología' },
    'hematology.wbc': { catalogId: 'wbc', label: 'Leucocitos', category: 'Hematología' },
    'hematology.neutrophils': { catalogId: 'neutrophils', label: 'Neutrófilos', category: 'Hematología' },
    'hematology.lymphocytes': { catalogId: 'lymphocytes', label: 'Linfocitos', category: 'Hematología' },
    'hematology.monocytes': { catalogId: 'monocytes', label: 'Monocitos', category: 'Hematología' },
    'hematology.eosinophils': { catalogId: 'eosinophils', label: 'Eosinófilos', category: 'Hematología' },
    'hematology.platelets': { catalogId: 'platelets', label: 'Plaquetas', category: 'Hematología' },
    'hematology.mpv': { catalogId: 'mpv', label: 'VPM', category: 'Hematología' },
    // Metabolic
    'metabolic.glucose': { catalogId: 'glucose_fasting', label: 'Glucosa', category: 'Metabolismo' },
    'metabolic.urea': { catalogId: 'urea', label: 'Urea', category: 'Metabolismo' },
    'metabolic.bun': { catalogId: 'bun', label: 'BUN', category: 'Metabolismo' },
    'metabolic.creatinine': { catalogId: 'creatinine', label: 'Creatinina', category: 'Metabolismo' },
    'metabolic.gfr': { catalogId: 'egfr', label: 'TFG', category: 'Metabolismo' },
    'metabolic.uricAcid': { catalogId: 'uric_acid', label: 'Ácido Úrico', category: 'Metabolismo' },
    // Lipids
    'lipids.totalCholesterol': { catalogId: 'total_cholesterol', label: 'Colesterol Total', category: 'Lípidos' },
    'lipids.triglycerides': { catalogId: 'triglycerides', label: 'Triglicéridos', category: 'Lípidos' },
    'lipids.hdl': { catalogId: 'hdl', label: 'HDL', category: 'Lípidos' },
    'lipids.ldl': { catalogId: 'ldl', label: 'LDL', category: 'Lípidos' },
    'lipids.vldl': { catalogId: 'vldl', label: 'VLDL', category: 'Lípidos' },
    'lipids.tgHdlRatio': { catalogId: 'tg_hdl_ratio', label: 'TG/HDL', category: 'Lípidos' },
    // Liver
    'liver.alkalinePhosphatase': { catalogId: 'alkaline_phosphatase', label: 'Fosfatasa Alcalina', category: 'Hepático' },
    'liver.ast': { catalogId: 'ast', label: 'AST', category: 'Hepático' },
    'liver.alt': { catalogId: 'alt', label: 'ALT', category: 'Hepático' },
    'liver.ggt': { catalogId: 'ggt', label: 'GGT', category: 'Hepático' },
    'liver.ldh': { catalogId: 'ldh', label: 'LDH', category: 'Hepático' },
    'liver.totalProtein': { catalogId: 'total_protein', label: 'Proteínas Totales', category: 'Hepático' },
    'liver.albumin': { catalogId: 'albumin', label: 'Albúmina', category: 'Hepático' },
    'liver.totalBilirubin': { catalogId: 'bilirubin_total', label: 'Bilirrubina Total', category: 'Hepático' },
    'liver.amylase': { catalogId: 'amylase', label: 'Amilasa', category: 'Hepático' },
    // Vitamins
    'vitamins.vitaminD': { catalogId: 'vitamin_d', label: 'Vitamina D', category: 'Vitaminas' },
    'vitamins.vitaminB12': { catalogId: 'vitamin_b12', label: 'Vitamina B12', category: 'Vitaminas' },
    'vitamins.ferritin': { catalogId: 'ferritin', label: 'Ferritina', category: 'Vitaminas' },
    // Hormones
    'hormones.tsh': { catalogId: 'tsh', label: 'TSH', category: 'Hormonas' },
    'hormones.testosterone': { catalogId: 'testosterone_total', label: 'Testosterona', category: 'Hormonas' },
    'hormones.cortisol': { catalogId: 'cortisol', label: 'Cortisol', category: 'Hormonas' },
    'hormones.insulin': { catalogId: 'insulin_fasting', label: 'Insulina', category: 'Hormonas' },
    'hormones.hba1c': { catalogId: 'hba1c', label: 'HbA1c', category: 'Hormonas' },
    // Inflammation
    'inflammation.crp': { catalogId: 'crp_hs', label: 'PCR-us', category: 'Inflamación' },
    'inflammation.homocysteine': { catalogId: 'homocysteine', label: 'Homocisteína', category: 'Inflamación' },
  }

  for (const [path, meta] of Object.entries(MAP)) {
    const [section, key] = path.split('.')
    const sectionData = pd[section as keyof ParsedData]
    if (!sectionData) continue
    const bv = (sectionData as unknown as Record<string, BiomarkerValue | null>)[key]
    if (bv?.value != null) {
      result.push({ ...meta, value: bv })
    }
  }

  return result
}

// ── Status helpers ──────────────────────────────────────────

const STATUS_COLORS: Record<BiomarkerStatus, { bg: string; text: string; border: string; dot: string }> = {
  optimal: { bg: 'bg-accent/10', text: 'text-accent', border: 'border-accent/25', dot: '#2EAE7B' },
  normal: { bg: 'bg-info/10', text: 'text-info', border: 'border-info/25', dot: '#5BA4C9' },
  attention: { bg: 'bg-warning/10', text: 'text-warning', border: 'border-warning/25', dot: '#D4A03A' },
  critical: { bg: 'bg-danger/10', text: 'text-danger', border: 'border-danger/25', dot: '#D4536A' },
}

const STATUS_LABELS: Record<BiomarkerStatus, string> = {
  optimal: 'Óptimo',
  normal: 'Normal',
  attention: 'Atención',
  critical: 'Crítico',
}

const CATEGORY_ICONS: Record<string, typeof Activity> = {
  'Hematología': Droplets,
  'Metabolismo': FlaskConical,
  'Lípidos': Heart,
  'Hepático': Shield,
  'Vitaminas': Pill,
  'Hormonas': Activity,
  'Inflamación': Activity,
}

// ── Component ───────────────────────────────────────────────

interface InstantDashboardProps {
  patient: Patient
  result: LabResult
  allResults?: { id: string; result_date: string }[]
  viewerRole?: string
}

export function InstantDashboard({ patient, result, allResults = [], viewerRole = 'paciente' }: InstantDashboardProps) {
  const router = useRouter()
  const [aiReady, setAiReady] = useState(false)
  const [polling, setPolling] = useState(true)
  const [deleting, setDeleting] = useState(false)

  async function handleDeleteResult() {
    if (!window.confirm('¿Eliminar este análisis? Se borrarán los biomarcadores extraídos y el dashboard instantáneo.')) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/results/${result.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Error al eliminar')
      toast.success('Análisis eliminado')
      router.push(`/patients/${patient.id}/upload`)
    } catch {
      toast.error('Error al eliminar el análisis')
      setDeleting(false)
    }
  }
  const parsedData = result.parsed_data as ParsedData | null

  // Poll for AI analysis completion
  const checkAi = useCallback(async () => {
    const { data } = await supabase
      .from('lab_results')
      .select('ai_analysis')
      .eq('id', result.id)
      .single()

    if (data?.ai_analysis) {
      setAiReady(true)
      setPolling(false)
    }
  }, [result.id])

  useEffect(() => {
    if (!polling) return
    const interval = setInterval(checkAi, 8000)
    // Check immediately
    checkAi()
    return () => clearInterval(interval)
  }, [polling, checkAi])

  if (!parsedData) return null

  const biomarkers = flattenParsedData(parsedData)
  const gender = patient.gender === 'female' ? 'female' : 'male'

  // Evaluate each biomarker
  const evaluated = biomarkers.map(bm => {
    const evaluation = evaluateBiomarker(bm.catalogId, bm.value.value!, gender, patient.age)
    const catalogEntry = findBiomarker(bm.catalogId)
    return {
      ...bm,
      status: (evaluation?.status ?? bm.value.status ?? 'normal') as BiomarkerStatus,
      meaning: evaluation?.status === 'attention' || evaluation?.status === 'critical'
        ? (bm.value.value! > (bm.value.refMax ?? Infinity) ? catalogEntry?.highMeaning : catalogEntry?.lowMeaning)
        : undefined,
    }
  })

  // Group by category
  const grouped: Record<string, typeof evaluated> = {}
  for (const bm of evaluated) {
    if (!grouped[bm.category]) grouped[bm.category] = []
    grouped[bm.category].push(bm)
  }

  // Summary counts
  const counts = { optimal: 0, normal: 0, attention: 0, critical: 0 }
  for (const bm of evaluated) counts[bm.status]++

  const total = evaluated.length
  const scorePercent = total > 0
    ? Math.round(((counts.optimal * 100 + counts.normal * 70 + counts.attention * 35 + counts.critical * 10) / total))
    : 0

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-card/90 backdrop-blur-xl border-b border-border/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-2 shrink-0">
                <LogoIcon size={32} />
                <span className="hidden sm:block font-semibold text-foreground text-sm tracking-tight">Longevity IA</span>
              </Link>
              <span className="text-border/50 hidden sm:block">|</span>
              <Link href="/patients" className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-white/5">
                <ArrowLeft size={17} />
              </Link>
              <div>
                <p className="text-sm font-semibold text-foreground leading-none">{patient.name}</p>
                <p className="text-[10px] text-muted-foreground">{patient.age} anos · {result.result_date}</p>
              </div>
            </div>

            {/* AI status indicator + delete */}
            <div className="flex items-center gap-2">
              {aiReady ? (
                <button
                  onClick={() => router.refresh()}
                  className="flex items-center gap-2 px-4 py-2 bg-accent text-background text-sm font-medium rounded-xl hover:bg-accent/90 transition-all shadow-accent/20 shadow-lg animate-scale-in"
                >
                  <Sparkles size={14} />
                  Ver Análisis IA Completo
                </button>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/30 border border-border/50">
                  <Loader2 size={14} className="text-accent animate-spin" />
                  <span className="text-xs text-muted-foreground">IA analizando...</span>
                </div>
              )}
              <button
                onClick={handleDeleteResult}
                disabled={deleting}
                className="flex items-center gap-1.5 px-3 py-2 text-xs text-red-400/60 border border-red-500/20 rounded-xl hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/30 transition-all disabled:opacity-50"
                title="Eliminar análisis"
              >
                <Trash2 size={13} />
                <span className="hidden sm:inline">{deleting ? 'Eliminando...' : 'Eliminar'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Score summary bar */}
        <div className="card-medical p-6 mb-6 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-foreground">Dashboard Instantaneo</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {total} biomarcadores evaluados con rangos de medicina de longevidad
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold font-mono" style={{ color: scorePercent >= 75 ? '#2EAE7B' : scorePercent >= 50 ? '#D4A03A' : '#D4536A' }}>
                {scorePercent}
              </p>
              <p className="text-[10px] text-muted-foreground">Score preliminar</p>
            </div>
          </div>

          {/* Status counters */}
          <div className="grid grid-cols-4 gap-3">
            {(['optimal', 'normal', 'attention', 'critical'] as BiomarkerStatus[]).map(status => {
              const colors = STATUS_COLORS[status]
              return (
                <div key={status} className={`flex items-center gap-2 p-3 rounded-xl border ${colors.bg} ${colors.border}`}>
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: colors.dot }} />
                  <div>
                    <p className={`text-lg font-bold font-mono ${colors.text}`}>{counts[status]}</p>
                    <p className="text-[10px] text-muted-foreground">{STATUS_LABELS[status]}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* AI banner */}
        {!aiReady && (
          <div className="mb-6 p-4 rounded-xl border border-accent/20 bg-accent/5 flex items-center gap-3 animate-fade-in">
            <Loader2 size={18} className="text-accent animate-spin shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">El analisis con IA esta en progreso</p>
              <p className="text-xs text-muted-foreground">
                Protocolo, FODA medica, proyeccion y mas se cargaran automaticamente cuando termine. Esto toma 2-5 minutos.
              </p>
            </div>
          </div>
        )}

        {aiReady && (
          <div className="mb-6 p-4 rounded-xl border border-accent/30 bg-accent/8 flex items-center gap-3 animate-scale-in">
            <CheckCircle2 size={18} className="text-accent shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Analisis IA completado</p>
              <p className="text-xs text-muted-foreground">FODA, protocolo, proyeccion y mas estan listos.</p>
            </div>
            <button
              onClick={() => router.refresh()}
              className="px-4 py-2 bg-accent text-background text-sm font-medium rounded-xl hover:bg-accent/90 transition-all"
            >
              Ver completo
            </button>
          </div>
        )}

        {/* Biomarker categories */}
        <div className="space-y-4">
          {Object.entries(grouped).map(([category, items], catIdx) => {
            const CatIcon = CATEGORY_ICONS[category] ?? Activity
            return (
              <div key={category} className="card-medical overflow-hidden animate-slide-up" style={{ animationDelay: `${catIdx * 0.08}s` }}>
                <div className="px-5 py-3 border-b border-border/40 flex items-center gap-2">
                  <CatIcon size={15} className="text-accent" />
                  <h3 className="text-sm font-bold text-foreground">{category}</h3>
                  <span className="text-[10px] text-muted-foreground ml-auto">{items.length} marcadores</span>
                </div>

                <div className="divide-y divide-border/20">
                  {items.map(bm => {
                    const colors = STATUS_COLORS[bm.status]
                    const refMin = bm.value.refMin
                    const refMax = bm.value.refMax
                    const val = bm.value.value!

                    // Calculate position in range bar (0-100)
                    let barMin = refMin ?? 0
                    let barMax = refMax ?? val * 2
                    if (barMin === barMax) barMax = barMin + 1
                    const range = barMax - barMin
                    const pos = Math.max(0, Math.min(100, ((val - barMin + range * 0.15) / (range * 1.3)) * 100))

                    return (
                      <div key={bm.catalogId} className="px-5 py-3 flex items-center gap-4">
                        {/* Status dot */}
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: colors.dot }} />

                        {/* Name + unit */}
                        <div className="w-32 shrink-0">
                          <p className="text-sm font-medium text-foreground leading-tight">{bm.label}</p>
                          <p className="text-[10px] text-muted-foreground">{bm.value.unit}</p>
                        </div>

                        {/* Value */}
                        <p className={`text-sm font-mono font-bold w-16 text-right shrink-0 ${colors.text}`}>
                          {val % 1 === 0 ? val : val.toFixed(1)}
                        </p>

                        {/* Range bar */}
                        <div className="flex-1 min-w-0 hidden sm:block">
                          <div className="relative h-1.5 bg-muted/40 rounded-full overflow-visible">
                            {/* Reference range highlight */}
                            <div
                              className="absolute h-full bg-accent/15 rounded-full"
                              style={{ left: '15%', right: '15%' }}
                            />
                            {/* Value marker */}
                            <div
                              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-background"
                              style={{ left: `${pos}%`, background: colors.dot, transform: `translate(-50%, -50%)` }}
                            />
                          </div>
                          <div className="flex justify-between mt-0.5">
                            <span className="text-[9px] text-muted-foreground/50">{refMin ?? ''}</span>
                            <span className="text-[9px] text-muted-foreground/50">{refMax ?? ''}</span>
                          </div>
                        </div>

                        {/* Status badge */}
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${colors.bg} ${colors.text} border ${colors.border}`}>
                          {STATUS_LABELS[bm.status]}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
