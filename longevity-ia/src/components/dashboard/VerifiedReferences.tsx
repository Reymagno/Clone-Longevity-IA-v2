'use client'

import { useState, useEffect } from 'react'
import type { ProtocolItem } from '@/types'
import type { ProtocolReferences, VerifiedReference } from '@/lib/medical-references'
import { ExternalLink, Search, BookMarked, Loader2 } from 'lucide-react'

interface VerifiedReferencesProps {
  protocol: ProtocolItem[]
}

const SOURCE_LABELS: Record<string, string> = {
  pubmed: 'PubMed',
  semantic_scholar: 'Semantic Scholar',
  openalex: 'OpenAlex',
}

const SOURCE_COLORS: Record<string, string> = {
  pubmed: '#2EAE7B',
  semantic_scholar: '#5BA4C9',
  openalex: '#D4A03A',
}

export function VerifiedReferences({ protocol }: VerifiedReferencesProps) {
  const [references, setReferences] = useState<ProtocolReferences[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  async function fetchReferences() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/references', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          protocol: protocol.map(p => ({
            molecule: p.molecule,
            evidence: p.evidence,
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error')
      setReferences(data.references ?? [])
      setLoaded(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al buscar referencias')
    } finally {
      setLoading(false)
    }
  }

  // Don't auto-fetch — let the medico click to search
  if (!loaded && !loading) {
    return (
      <div className="mt-6 p-4 rounded-xl border border-accent/20 bg-accent/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookMarked size={16} className="text-accent" />
            <span className="text-sm font-semibold text-accent">Referencias Verificadas</span>
            <span className="text-xs text-muted-foreground ml-1">PubMed · Semantic Scholar · OpenAlex</span>
          </div>
          <button
            onClick={fetchReferences}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-accent text-background rounded-lg hover:bg-accent/90 transition-all"
          >
            <Search size={12} />
            Buscar referencias científicas
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Busca en 3 bases de datos académicas para verificar y enriquecer las citas del protocolo con DOI y enlaces directos a los estudios originales.
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="mt-6 p-6 rounded-xl border border-accent/20 bg-accent/5 flex items-center justify-center gap-3">
        <Loader2 size={16} className="text-accent animate-spin" />
        <span className="text-sm text-accent">Buscando en PubMed, Semantic Scholar y OpenAlex...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mt-6 p-4 rounded-xl border border-danger/20 bg-danger/5">
        <p className="text-sm text-danger">{error}</p>
        <button
          onClick={fetchReferences}
          className="text-xs text-danger/70 hover:text-danger underline mt-1"
        >
          Reintentar
        </button>
      </div>
    )
  }

  const totalRefs = references.reduce((acc, r) => acc + r.references.length, 0)

  return (
    <div className="mt-6 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookMarked size={16} className="text-accent" />
          <span className="text-sm font-semibold text-accent">Referencias Verificadas</span>
          <span className="text-xs text-muted-foreground">
            {totalRefs} estudios encontrados en 3 bases de datos
          </span>
        </div>
        <button
          onClick={fetchReferences}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Actualizar
        </button>
      </div>

      {references.map((item, i) => (
        <div key={i} className="p-4 rounded-xl border border-border bg-card">
          <h4 className="text-sm font-semibold text-foreground mb-3">{item.molecule}</h4>

          {item.references.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No se encontraron referencias verificadas para esta intervención</p>
          ) : (
            <div className="space-y-2.5">
              {item.references.map((ref, j) => (
                <ReferenceCard key={j} ref_={ref} />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function ReferenceCard({ ref_ }: { ref_: VerifiedReference }) {
  return (
    <div className="p-3 rounded-lg bg-muted border border-border/60 hover:border-accent/30 transition-all">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <a
            href={ref_.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-foreground hover:text-accent transition-colors leading-snug line-clamp-2"
          >
            {ref_.title}
            <ExternalLink size={10} className="inline ml-1 opacity-50" />
          </a>
          <p className="text-[11px] text-muted-foreground mt-1">{ref_.authors}</p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {ref_.journal && (
              <span className="text-[11px] text-foreground/60 italic">{ref_.journal}</span>
            )}
            {ref_.year > 0 && (
              <span className="text-[11px] font-mono text-foreground/60">({ref_.year})</span>
            )}
            {ref_.doi && (
              <a
                href={`https://doi.org/${ref_.doi}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] font-mono text-accent/70 hover:text-accent transition-colors"
              >
                DOI: {ref_.doi}
              </a>
            )}
            {ref_.pmid && (
              <a
                href={`https://pubmed.ncbi.nlm.nih.gov/${ref_.pmid}/`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] font-mono text-accent/70 hover:text-accent transition-colors"
              >
                PMID: {ref_.pmid}
              </a>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span
            className="text-[10px] px-1.5 py-0.5 rounded font-medium"
            style={{
              color: SOURCE_COLORS[ref_.source] ?? '#6B6660',
              background: `${SOURCE_COLORS[ref_.source] ?? '#6B6660'}15`,
            }}
          >
            {SOURCE_LABELS[ref_.source] ?? ref_.source}
          </span>
          {ref_.citationCount != null && ref_.citationCount > 0 && (
            <span className="text-[10px] text-muted-foreground">{ref_.citationCount.toLocaleString()} citas</span>
          )}
        </div>
      </div>
    </div>
  )
}
