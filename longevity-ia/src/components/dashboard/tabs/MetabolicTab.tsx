'use client'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { ParsedData } from '@/types'
import { Activity, Droplets, Beaker, Sun, Thermometer } from 'lucide-react'

interface MetabolicTabProps {
  parsedData: ParsedData
}

function BioRow({ label, bm }: {
  label: string
  bm: { value: number | null; unit: string; refMin: number | null; refMax: number | null; optMin: number | null; optMax: number | null; status: string | null } | null | undefined
}) {
  if (!bm || bm.value === null) return null

  const pct = (() => {
    if (bm.refMin === null || bm.refMax === null || bm.refMax === bm.refMin) return null
    return Math.min(100, Math.max(0, ((bm.value - bm.refMin) / (bm.refMax - bm.refMin)) * 100))
  })()

  return (
    <div className="py-3 border-b border-border last:border-0">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm text-foreground/80">{label}</span>
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-medium text-foreground">
            {bm.value} <span className="text-muted-foreground text-xs">{bm.unit}</span>
          </span>
          <Badge variant={(bm.status as 'optimal' | 'normal' | 'warning' | 'danger' | undefined) ?? 'default'}>
            {bm.status === 'optimal' ? 'Óptimo' : bm.status === 'normal' ? 'Normal' : bm.status === 'warning' ? 'Atención' : bm.status === 'danger' ? 'Crítico' : '—'}
          </Badge>
        </div>
      </div>
      {pct !== null && (
        <div className="relative h-1.5 bg-muted rounded-full overflow-hidden">
          {/* Zona óptima */}
          {bm.optMin !== null && bm.optMax !== null && (
            <div
              className="absolute h-full bg-accent/20"
              style={{
                left: `${Math.max(0, ((bm.optMin - bm.refMin!) / (bm.refMax! - bm.refMin!)) * 100)}%`,
                width: `${((bm.optMax - bm.optMin) / (bm.refMax! - bm.refMin!)) * 100}%`,
              }}
            />
          )}
          {/* Indicador de valor */}
          <div
            className="absolute top-0 w-2 h-full rounded-full -ml-1 transition-all"
            style={{
              left: `${pct}%`,
              backgroundColor: bm.status === 'optimal' ? '#00e5a0' : bm.status === 'normal' ? '#38bdf8' : bm.status === 'warning' ? '#f5a623' : '#ff4d6d',
            }}
          />
        </div>
      )}
      {bm.refMin !== null && bm.refMax !== null && (
        <div className="flex justify-between mt-0.5 text-xs text-muted-foreground font-mono">
          <span>{bm.refMin}</span>
          {bm.optMin !== null && bm.optMax !== null && (
            <span className="text-accent">óptimo: {bm.optMin}–{bm.optMax}</span>
          )}
          <span>{bm.refMax}</span>
        </div>
      )}
    </div>
  )
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Icon size={16} className="text-accent" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

export function MetabolicTab({ parsedData }: MetabolicTabProps) {
  const { metabolic, liver, vitamins, hormones, hematology, inflammation } = parsedData

  const hasMetabolic = metabolic && Object.values(metabolic).some(v => v?.value !== null)
  const hasLiver = liver && Object.values(liver).some(v => v?.value !== null)
  const hasVitamins = vitamins && Object.values(vitamins).some(v => v?.value !== null)
  const hasHormones = hormones && Object.values(hormones).some(v => v?.value !== null)
  const hasHematology = hematology && Object.values(hematology).some(v => v?.value !== null)
  const hasInflammation = inflammation && Object.values(inflammation).some(v => v?.value !== null)

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {hasMetabolic && (
          <Section title="Panel Metabólico" icon={Activity}>
            <BioRow label="Glucosa" bm={metabolic.glucose} />
            <BioRow label="Urea" bm={metabolic.urea} />
            <BioRow label="BUN" bm={metabolic.bun} />
            <BioRow label="Creatinina" bm={metabolic.creatinine} />
            <BioRow label="TFG" bm={metabolic.gfr} />
            <BioRow label="Ácido Úrico" bm={metabolic.uricAcid} />
          </Section>
        )}

        {hasLiver && (
          <Section title="Panel Hepático" icon={Beaker}>
            <BioRow label="FA (Fosfatasa Alcalina)" bm={liver.alkalinePhosphatase} />
            <BioRow label="AST (TGO)" bm={liver.ast} />
            <BioRow label="ALT (TGP)" bm={liver.alt} />
            <BioRow label="GGT" bm={liver.ggt} />
            <BioRow label="LDH" bm={liver.ldh} />
            <BioRow label="Proteínas Totales" bm={liver.totalProtein} />
            <BioRow label="Albúmina" bm={liver.albumin} />
            <BioRow label="Globulina" bm={liver.globulin} />
            <BioRow label="Bilirrubina Total" bm={liver.totalBilirubin} />
            <BioRow label="Amilasa" bm={liver.amylase} />
          </Section>
        )}

        {hasVitamins && (
          <Section title="Vitaminas y Minerales" icon={Sun}>
            <BioRow label="Vitamina D" bm={vitamins.vitaminD} />
            <BioRow label="Vitamina B12" bm={vitamins.vitaminB12} />
            <BioRow label="Ferritina" bm={vitamins.ferritin} />
          </Section>
        )}

        {hasHormones && (
          <Section title="Hormonas" icon={Thermometer}>
            <BioRow label="TSH" bm={hormones.tsh} />
            <BioRow label="Testosterona" bm={hormones.testosterone} />
            <BioRow label="Cortisol" bm={hormones.cortisol} />
            <BioRow label="Insulina" bm={hormones.insulin} />
            <BioRow label="HbA1c" bm={hormones.hba1c} />
          </Section>
        )}

        {hasHematology && (
          <Section title="Hematología" icon={Droplets}>
            <BioRow label="Eritrocitos (RBC)" bm={hematology.rbc} />
            <BioRow label="Hemoglobina" bm={hematology.hemoglobin} />
            <BioRow label="Hematocrito" bm={hematology.hematocrit} />
            <BioRow label="VCM (MCV)" bm={hematology.mcv} />
            <BioRow label="HCM (MCH)" bm={hematology.mch} />
            <BioRow label="CHCM (MCHC)" bm={hematology.mchc} />
            <BioRow label="ADE (RDW)" bm={hematology.rdw} />
            <BioRow label="Leucocitos (WBC)" bm={hematology.wbc} />
            <BioRow label="Neutrófilos" bm={hematology.neutrophils} />
            <BioRow label="Linfocitos" bm={hematology.lymphocytes} />
            <BioRow label="Monocitos" bm={hematology.monocytes} />
            <BioRow label="Eosinófilos" bm={hematology.eosinophils} />
            <BioRow label="Plaquetas" bm={hematology.platelets} />
            <BioRow label="VPM (MPV)" bm={hematology.mpv} />
          </Section>
        )}

        {hasInflammation && (
          <Section title="Marcadores Inflamatorios" icon={Activity}>
            <BioRow label="PCR (Proteína C Reactiva)" bm={inflammation.crp} />
            <BioRow label="Homocisteína" bm={inflammation.homocysteine} />
          </Section>
        )}
      </div>
    </div>
  )
}
