'use client'

import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip,
  ReferenceLine, Cell,
} from 'recharts'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Lipids } from '@/types'
import { getStatusColor } from '@/lib/utils'
import { Heart } from 'lucide-react'

interface LipidsTabProps {
  lipids: Lipids
}

function BiomarkerRow({ label, bm }: { label: string; bm: { value: number | null; unit: string; refMin: number | null; refMax: number | null; optMin: number | null; optMax: number | null; status: string | null } | null }) {
  if (!bm || bm.value === null) return null

  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <span className="text-sm text-foreground/80">{label}</span>
      <div className="flex items-center gap-3">
        <span className="font-mono text-sm font-medium text-foreground">
          {bm.value} <span className="text-muted-foreground text-xs">{bm.unit}</span>
        </span>
        {bm.refMin !== null && bm.refMax !== null && (
          <span className="text-xs text-muted-foreground font-mono">
            [{bm.refMin}–{bm.refMax}]
          </span>
        )}
        <Badge variant={(bm.status as 'optimal' | 'normal' | 'warning' | 'danger' | undefined) ?? 'default'}>
          {bm.status === 'optimal' ? 'Óptimo' : bm.status === 'normal' ? 'Normal' : bm.status === 'warning' ? 'Atención' : bm.status === 'danger' ? 'Crítico' : '—'}
        </Badge>
      </div>
    </div>
  )
}

const LIPID_LABELS: Record<string, string> = {
  totalCholesterol: 'Col. Total',
  triglycerides: 'Triglicéridos',
  hdl: 'HDL',
  ldl: 'LDL',
  vldl: 'VLDL',
  nonHdl: 'No-HDL',
}

const OPT_TARGETS: Record<string, number> = {
  totalCholesterol: 180,
  triglycerides: 100,
  hdl: 60,
  ldl: 70,
  vldl: 30,
  nonHdl: 110,
}

export function LipidsTab({ lipids }: LipidsTabProps) {
  const chartData = Object.entries(lipids)
    .filter(([key, bm]) => bm && bm.value !== null && LIPID_LABELS[key])
    .map(([key, bm]) => ({
      name: LIPID_LABELS[key],
      value: bm!.value as number,
      target: OPT_TARGETS[key] ?? null,
      status: bm!.status,
      unit: bm!.unit,
    }))

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Gráfica comparativa */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart size={18} className="text-danger" />
              Perfil Lipídico vs Rangos Óptimos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} margin={{ top: 10, right: 20, bottom: 5, left: 10 }}>
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#E2DFD6', fontSize: 11, fontFamily: 'Space Grotesk' }}
                />
                <YAxis tick={{ fill: '#6B6660', fontSize: 11, fontFamily: 'DM Mono' }} />
                <Tooltip
                  contentStyle={{ background: '#112F22', border: '1px solid #215440', borderRadius: 8 }}
                  formatter={(value: number, _: string, props) => [
                    <span key="v" className="font-mono">{value} {props.payload.unit}</span>,
                    props.payload.name,
                  ]}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={60}>
                  {chartData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={getStatusColor(entry.status)}
                      fillOpacity={0.85}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Tabla de valores */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Lípidos Principales</CardTitle>
          </CardHeader>
          <CardContent>
            <BiomarkerRow label="Colesterol Total" bm={lipids.totalCholesterol} />
            <BiomarkerRow label="Triglicéridos" bm={lipids.triglycerides} />
            <BiomarkerRow label="HDL (bueno)" bm={lipids.hdl} />
            <BiomarkerRow label="LDL (malo)" bm={lipids.ldl} />
            <BiomarkerRow label="VLDL" bm={lipids.vldl} />
            <BiomarkerRow label="No-HDL" bm={lipids.nonHdl} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Índices Cardiovasculares</CardTitle>
          </CardHeader>
          <CardContent>
            <BiomarkerRow label="Índice Aterogénico" bm={lipids.atherogenicIndex} />
            <BiomarkerRow label="Ratio LDL/HDL" bm={lipids.ldlHdlRatio} />
            <BiomarkerRow label="Ratio TG/HDL" bm={lipids.tgHdlRatio} />

            {/* Tabla de rangos óptimos */}
            <div className="mt-4 p-3 rounded-lg bg-muted border border-border">
              <p className="text-xs text-muted-foreground font-semibold mb-2">Rangos Óptimos Longevidad</p>
              <div className="space-y-1.5 text-xs font-mono">
                <div className="flex justify-between"><span>LDL</span><span className="text-accent">&lt; 70 mg/dL</span></div>
                <div className="flex justify-between"><span>HDL</span><span className="text-accent">&gt; 60 mg/dL</span></div>
                <div className="flex justify-between"><span>Triglicéridos</span><span className="text-accent">&lt; 100 mg/dL</span></div>
                <div className="flex justify-between"><span>Col. Total</span><span className="text-accent">&lt; 180 mg/dL</span></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
