'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { AIAnalysis } from '@/types'
import { getUrgencyColor, getUrgencyLabel } from '@/lib/utils'
import { FlaskConical, BookOpen, Target, Zap } from 'lucide-react'

interface ProtocolTabProps {
  protocol: AIAnalysis['protocol']
}

export function ProtocolTab({ protocol }: ProtocolTabProps) {
  if (!protocol || protocol.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground">
        No hay protocolo disponible
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {protocol.length} intervenciones basadas en evidencia científica
        </p>
      </div>

      {protocol.map((item, i) => {
        const urgency = item.urgency ?? 'medium'
        const displayNumber = String(item.number ?? (i + 1)).padStart(2, '0')
        const biomarkers = Array.isArray(item.targetBiomarkers) ? item.targetBiomarkers : []

        return (
          <Card key={i} className="hover:border-accent/30 transition-all">
            {/* Header */}
            <div className="flex items-start justify-between p-5 pb-0">
              <div className="flex items-start gap-4">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 font-mono font-bold text-sm"
                  style={{
                    background: `${getUrgencyColor(urgency)}20`,
                    color: getUrgencyColor(urgency),
                    border: `1px solid ${getUrgencyColor(urgency)}40`,
                  }}
                >
                  {displayNumber}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-semibold text-foreground">{item.molecule ?? ''}</h3>
                    {item.category && <Badge variant="default">{item.category}</Badge>}
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{
                        background: `${getUrgencyColor(urgency)}20`,
                        color: getUrgencyColor(urgency),
                      }}
                    >
                      {getUrgencyLabel(urgency)}
                    </span>
                  </div>
                  <p className="text-sm font-mono text-muted-foreground">{item.dose ?? ''}</p>
                </div>
              </div>
            </div>

            <CardContent className="pt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Mecanismo */}
                <div className="p-3 rounded-lg bg-muted border border-border">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <FlaskConical size={13} className="text-info" />
                    <span className="text-xs font-semibold text-info">Mecanismo</span>
                  </div>
                  <p className="text-xs text-foreground/80 leading-relaxed">{item.mechanism ?? ''}</p>
                </div>

                {/* Evidencia */}
                <div className="p-3 rounded-lg bg-muted border border-border">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <BookOpen size={13} className="text-accent" />
                    <span className="text-xs font-semibold text-accent">Evidencia Científica</span>
                  </div>
                  <p className="text-xs text-foreground/80 leading-relaxed">{item.evidence ?? ''}</p>
                  {item.clinicalTrial && (
                    <p className="text-xs text-muted-foreground mt-1 font-mono">{item.clinicalTrial}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Biomarcadores objetivo */}
                {biomarkers.length > 0 && (
                  <div className="p-3 rounded-lg bg-muted border border-border">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Target size={13} className="text-warning" />
                      <span className="text-xs font-semibold text-warning">Biomarcadores Objetivo</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {biomarkers.map((bm, j) => (
                        <span key={j} className="text-xs px-2 py-0.5 rounded-full bg-warning/10 text-warning border border-warning/20">
                          {bm}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Resultado esperado */}
                <div className="p-3 rounded-lg bg-muted border border-border">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Zap size={13} className="text-danger" />
                    <span className="text-xs font-semibold text-danger">Resultado Esperado</span>
                  </div>
                  <p className="text-xs text-foreground/80 leading-relaxed">{item.expectedResult ?? ''}</p>
                </div>
              </div>

              {/* Acción concreta */}
              {item.action && (
                <div className="p-3 rounded-lg border" style={{ borderColor: `${getUrgencyColor(urgency)}40`, background: `${getUrgencyColor(urgency)}08` }}>
                  <span className="text-xs font-semibold" style={{ color: getUrgencyColor(urgency) }}>
                    Acción:{' '}
                  </span>
                  <span className="text-xs text-foreground/90">{item.action}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
