'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { FileText, Plus, Clock, ChevronDown, Send } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface ClinicalNote {
  id: string
  note_type: string
  subjective: string | null
  objective: string | null
  assessment: string | null
  plan: string | null
  content: string | null
  biomarker_key: string | null
  diagnoses: string[] | null
  created_at: string
}

interface ClinicalNotesPanelProps {
  patientId: string
  resultId: string
  viewerRole?: string
}

export function ClinicalNotesPanel({ patientId, resultId, viewerRole }: ClinicalNotesPanelProps) {
  const [notes, setNotes] = useState<ClinicalNote[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [expandedNote, setExpandedNote] = useState<string | null>(null)

  const [form, setForm] = useState({
    subjective: '',
    objective: '',
    assessment: '',
    plan: '',
  })

  if (viewerRole !== 'medico') return null

  async function loadNotes() {
    try {
      const res = await fetch(`/api/medico/notes?patientId=${patientId}`)
      if (res.ok) setNotes(await res.json())
    } catch { /* ignore */ } finally { setLoading(false) }
  }

  useEffect(() => { loadNotes() }, [patientId])

  async function handleSave() {
    if (!form.subjective && !form.objective && !form.assessment && !form.plan) {
      toast.error('Escribe al menos un campo de la nota SOAP')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/medico/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId,
          resultId,
          noteType: 'soap',
          ...form,
        }),
      })
      if (!res.ok) throw new Error('Error al guardar')
      toast.success('Nota clínica guardada')
      setForm({ subjective: '', objective: '', assessment: '', plan: '' })
      setShowForm(false)
      loadNotes()
    } catch {
      toast.error('Error al guardar la nota')
    } finally { setSaving(false) }
  }

  return (
    <div className="mt-6 border border-border/40 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-muted/20 border-b border-border/30">
        <div className="flex items-center gap-2">
          <FileText size={15} className="text-accent" />
          <span className="text-sm font-semibold text-foreground">Notas Clínicas</span>
          <span className="text-[10px] text-muted-foreground">Formato SOAP</span>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-accent border border-accent/30 rounded-lg hover:bg-accent/10 transition-all"
        >
          <Plus size={12} />
          Nueva nota
        </button>
      </div>

      {/* Formulario SOAP */}
      {showForm && (
        <div className="p-4 border-b border-border/30 bg-card space-y-3 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-info mb-1 block">S — Subjetivo</label>
              <textarea
                value={form.subjective}
                onChange={(e) => setForm(f => ({ ...f, subjective: e.target.value }))}
                placeholder="Lo que el paciente reporta (síntomas, quejas, historia)..."
                className="w-full bg-muted/30 border border-border/40 rounded-lg p-2.5 text-xs text-foreground placeholder:text-muted-foreground/50 resize-none h-20 focus:outline-none focus:border-accent/50"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-accent mb-1 block">O — Objetivo</label>
              <textarea
                value={form.objective}
                onChange={(e) => setForm(f => ({ ...f, objective: e.target.value }))}
                placeholder="Hallazgos del examen físico, signos vitales, labs relevantes..."
                className="w-full bg-muted/30 border border-border/40 rounded-lg p-2.5 text-xs text-foreground placeholder:text-muted-foreground/50 resize-none h-20 focus:outline-none focus:border-accent/50"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-warning mb-1 block">A — Evaluación</label>
              <textarea
                value={form.assessment}
                onChange={(e) => setForm(f => ({ ...f, assessment: e.target.value }))}
                placeholder="Diagnósticos, interpretación clínica, severidad..."
                className="w-full bg-muted/30 border border-border/40 rounded-lg p-2.5 text-xs text-foreground placeholder:text-muted-foreground/50 resize-none h-20 focus:outline-none focus:border-accent/50"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-danger mb-1 block">P — Plan</label>
              <textarea
                value={form.plan}
                onChange={(e) => setForm(f => ({ ...f, plan: e.target.value }))}
                placeholder="Plan de tratamiento, ajustes al protocolo, próximos pasos..."
                className="w-full bg-muted/30 border border-border/40 rounded-lg p-2.5 text-xs text-foreground placeholder:text-muted-foreground/50 resize-none h-20 focus:outline-none focus:border-accent/50"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium bg-accent text-background rounded-lg hover:bg-accent/90 transition-all disabled:opacity-50"
            >
              <Send size={11} />
              {saving ? 'Guardando...' : 'Guardar nota'}
            </button>
          </div>
        </div>
      )}

      {/* Lista de notas */}
      <div className="max-h-80 overflow-y-auto">
        {loading ? (
          <div className="p-4 space-y-2">
            <div className="h-12 shimmer rounded-lg" />
            <div className="h-12 shimmer rounded-lg" />
          </div>
        ) : notes.length === 0 ? (
          <div className="p-6 text-center">
            <FileText size={24} className="text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Sin notas clínicas para este paciente</p>
          </div>
        ) : (
          notes.map(note => (
            <div key={note.id} className="border-b border-border/20 last:border-0">
              <button
                onClick={() => setExpandedNote(expandedNote === note.id ? null : note.id)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/10 transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  <Clock size={11} className="text-muted-foreground/50" />
                  <span className="text-[11px] text-muted-foreground">{formatDate(note.created_at)}</span>
                  {note.assessment && (
                    <span className="text-[11px] text-foreground/70 truncate max-w-[200px]">{note.assessment}</span>
                  )}
                </div>
                <ChevronDown size={12} className={`text-muted-foreground transition-transform ${expandedNote === note.id ? 'rotate-180' : ''}`} />
              </button>
              {expandedNote === note.id && (
                <div className="px-4 pb-3 grid grid-cols-2 gap-2 animate-fade-in">
                  {note.subjective && (
                    <div className="p-2 rounded bg-info/5 border border-info/10">
                      <p className="text-[10px] font-semibold text-info mb-0.5">Subjetivo</p>
                      <p className="text-[11px] text-foreground/70">{note.subjective}</p>
                    </div>
                  )}
                  {note.objective && (
                    <div className="p-2 rounded bg-accent/5 border border-accent/10">
                      <p className="text-[10px] font-semibold text-accent mb-0.5">Objetivo</p>
                      <p className="text-[11px] text-foreground/70">{note.objective}</p>
                    </div>
                  )}
                  {note.assessment && (
                    <div className="p-2 rounded bg-warning/5 border border-warning/10">
                      <p className="text-[10px] font-semibold text-warning mb-0.5">Evaluación</p>
                      <p className="text-[11px] text-foreground/70">{note.assessment}</p>
                    </div>
                  )}
                  {note.plan && (
                    <div className="p-2 rounded bg-danger/5 border border-danger/10">
                      <p className="text-[10px] font-semibold text-danger mb-0.5">Plan</p>
                      <p className="text-[11px] text-foreground/70">{note.plan}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
