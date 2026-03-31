'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import {
  FileText, Plus, Clock, ChevronDown, Send, Stethoscope,
  FlaskConical, ClipboardList, Tag, CheckCircle2, XCircle,
  Edit3, MessageSquare, Search, Trash2,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { ParsedData, ProtocolItem } from '@/types'

// ── Types ──────────────────────────────────────────────────────

interface ClinicalNote {
  id: string
  note_type: string
  subjective: string | null
  objective: string | null
  assessment: string | null
  plan: string | null
  content: string | null
  biomarker_key: string | null
  protocol_adjustments: ProtocolAdjustment[] | null
  diagnoses: string[] | null
  created_at: string
}

interface ProtocolAdjustment {
  molecule: string
  action: 'approve' | 'reject' | 'modify'
  newDose?: string
  reason: string
}

interface ClinicalNotesPanelProps {
  patientId: string
  resultId: string
  viewerRole?: string
  parsedData?: ParsedData | null
  protocol?: ProtocolItem[]
}

// ── CIE-10 common longevity codes ──────────────────────────────

const CIE10_CODES = [
  { code: 'E11', label: 'Diabetes mellitus tipo 2' },
  { code: 'E78.0', label: 'Hipercolesterolemia pura' },
  { code: 'E78.1', label: 'Hipertrigliceridemia pura' },
  { code: 'E78.2', label: 'Hiperlipidemia mixta' },
  { code: 'E78.5', label: 'Hiperlipidemia no especificada' },
  { code: 'E66.0', label: 'Obesidad por exceso de calorias' },
  { code: 'E66.9', label: 'Obesidad no especificada' },
  { code: 'E03.9', label: 'Hipotiroidismo no especificado' },
  { code: 'E05.9', label: 'Hipertiroidismo no especificado' },
  { code: 'E61.1', label: 'Deficiencia de hierro' },
  { code: 'E55.9', label: 'Deficiencia de vitamina D' },
  { code: 'E53.8', label: 'Deficiencia de vitamina B12' },
  { code: 'D50.9', label: 'Anemia por deficiencia de hierro' },
  { code: 'D64.9', label: 'Anemia no especificada' },
  { code: 'I10', label: 'Hipertension esencial primaria' },
  { code: 'I25.1', label: 'Enfermedad aterosclerotica del corazon' },
  { code: 'I73.9', label: 'Enfermedad vascular periferica' },
  { code: 'K76.0', label: 'Higado graso no alcoholico' },
  { code: 'K73.9', label: 'Hepatitis cronica no especificada' },
  { code: 'N18.3', label: 'Enfermedad renal cronica estadio 3' },
  { code: 'N18.4', label: 'Enfermedad renal cronica estadio 4' },
  { code: 'M81.0', label: 'Osteoporosis posmenopausica' },
  { code: 'R73.0', label: 'Glucosa en ayunas alterada (prediabetes)' },
  { code: 'R79.0', label: 'Hallazgos anormales en quimica sanguinea' },
  { code: 'Z71.3', label: 'Consejeria dietetica y de vigilancia' },
  { code: 'Z13.6', label: 'Deteccion de enfermedad cardiovascular' },
  { code: 'Z86.7', label: 'Historia personal de enfermedades circulatorias' },
]

// ── Tab definitions ────────────────────────────────────────────

type PanelTab = 'soap' | 'biomarker' | 'protocol' | 'diagnoses'

const PANEL_TABS: { id: PanelTab; label: string; icon: typeof FileText }[] = [
  { id: 'soap', label: 'SOAP', icon: FileText },
  { id: 'biomarker', label: 'Biomarcadores', icon: FlaskConical },
  { id: 'protocol', label: 'Protocolo', icon: ClipboardList },
  { id: 'diagnoses', label: 'CIE-10', icon: Tag },
]

// ── Main Component ─────────────────────────────────────────────

export function ClinicalNotesPanel({ patientId, resultId, viewerRole, parsedData, protocol }: ClinicalNotesPanelProps) {
  const [notes, setNotes] = useState<ClinicalNote[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<PanelTab>('soap')
  const [expandedNote, setExpandedNote] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // SOAP form
  const [showSoapForm, setShowSoapForm] = useState(false)
  const [soapForm, setSoapForm] = useState({ subjective: '', objective: '', assessment: '', plan: '' })

  // Biomarker comment form
  const [showBiomarkerForm, setShowBiomarkerForm] = useState(false)
  const [biomarkerForm, setBiomarkerForm] = useState({ biomarkerKey: '', comment: '' })

  // Protocol adjustment form
  const [showProtocolForm, setShowProtocolForm] = useState(false)
  const [protocolAdjustments, setProtocolAdjustments] = useState<ProtocolAdjustment[]>([])

  // CIE-10 form
  const [showDiagnosesForm, setShowDiagnosesForm] = useState(false)
  const [selectedDiagnoses, setSelectedDiagnoses] = useState<string[]>([])
  const [diagSearch, setDiagSearch] = useState('')

  async function loadNotes() {
    if (viewerRole !== 'medico') return
    try {
      const res = await fetch(`/api/medico/notes?patientId=${patientId}`)
      if (res.ok) setNotes(await res.json())
    } catch { /* silencio intencional — panel no crítico */ } finally { setLoading(false) }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadNotes() }, [patientId, viewerRole])

  if (viewerRole !== 'medico') return null

  async function saveNote(body: Record<string, unknown>) {
    setSaving(true)
    try {
      const res = await fetch('/api/medico/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId, resultId, ...body }),
      })
      if (!res.ok) throw new Error('Error al guardar')
      toast.success('Nota guardada')
      loadNotes()
      return true
    } catch {
      toast.error('Error al guardar la nota')
      return false
    } finally { setSaving(false) }
  }

  async function deleteNote(noteId: string) {
    try {
      const res = await fetch(`/api/medico/notes?noteId=${noteId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Error al eliminar')
      toast.success('Nota eliminada')
      setNotes(prev => prev.filter(n => n.id !== noteId))
    } catch {
      toast.error('Error al eliminar la nota')
    }
  }

  async function handleSaveSoap() {
    if (!soapForm.subjective && !soapForm.objective && !soapForm.assessment && !soapForm.plan) {
      toast.error('Escribe al menos un campo SOAP')
      return
    }
    const ok = await saveNote({ noteType: 'soap', ...soapForm })
    if (ok) {
      setSoapForm({ subjective: '', objective: '', assessment: '', plan: '' })
      setShowSoapForm(false)
    }
  }

  async function handleSaveBiomarkerComment() {
    if (!biomarkerForm.biomarkerKey || !biomarkerForm.comment) {
      toast.error('Selecciona biomarcador y escribe comentario')
      return
    }
    const ok = await saveNote({
      noteType: 'comment',
      biomarkerKey: biomarkerForm.biomarkerKey,
      content: biomarkerForm.comment,
    })
    if (ok) {
      setBiomarkerForm({ biomarkerKey: '', comment: '' })
      setShowBiomarkerForm(false)
    }
  }

  async function handleSaveProtocolAdjustments() {
    if (protocolAdjustments.length === 0) {
      toast.error('Marca al menos una intervencion')
      return
    }
    const ok = await saveNote({
      noteType: 'protocol_adjustment',
      protocolAdjustments,
      content: protocolAdjustments.map(a =>
        `${a.molecule}: ${a.action === 'approve' ? 'Aprobada' : a.action === 'reject' ? 'Rechazada' : `Modificada → ${a.newDose}`} — ${a.reason}`
      ).join('\n'),
    })
    if (ok) {
      setProtocolAdjustments([])
      setShowProtocolForm(false)
    }
  }

  async function handleSaveDiagnoses() {
    if (selectedDiagnoses.length === 0) {
      toast.error('Selecciona al menos un diagnostico')
      return
    }
    const ok = await saveNote({
      noteType: 'diagnosis',
      diagnoses: selectedDiagnoses,
      content: selectedDiagnoses.map(code => {
        const cie = CIE10_CODES.find(c => c.code === code)
        return cie ? `${cie.code} — ${cie.label}` : code
      }).join('\n'),
    })
    if (ok) {
      setSelectedDiagnoses([])
      setShowDiagnosesForm(false)
    }
  }

  // ── Extract available biomarkers from parsedData ──────────────

  const biomarkerOptions: { key: string; label: string; value: number | null; unit: string; status: string | null }[] = []
  if (parsedData) {
    const sections: Record<string, Record<string, string>> = {
      hematology: { hemoglobin: 'Hemoglobina', rdw: 'RDW', wbc: 'Leucocitos', platelets: 'Plaquetas', hematocrit: 'Hematocrito' },
      metabolic: { glucose: 'Glucosa', creatinine: 'Creatinina', gfr: 'GFR', uricAcid: 'Acido Urico' },
      lipids: { ldl: 'LDL', hdl: 'HDL', triglycerides: 'Trigliceridos', totalCholesterol: 'Colesterol Total' },
      liver: { alt: 'ALT', ast: 'AST', ggt: 'GGT', albumin: 'Albumina' },
      vitamins: { vitaminD: 'Vitamina D', vitaminB12: 'Vitamina B12', ferritin: 'Ferritina' },
      hormones: { tsh: 'TSH', insulin: 'Insulina', hba1c: 'HbA1c', testosterone: 'Testosterona' },
      inflammation: { crp: 'PCR', homocysteine: 'Homocisteina' },
    }
    for (const [section, keys] of Object.entries(sections)) {
      const sectionData = (parsedData as unknown as Record<string, unknown>)[section] as Record<string, unknown> | null
      if (!sectionData) continue
      for (const [key, label] of Object.entries(keys)) {
        const bm = sectionData[key] as { value?: number | null; unit?: string; status?: string } | null
        if (bm?.value != null) {
          biomarkerOptions.push({ key: `${section}.${key}`, label, value: bm.value, unit: bm.unit ?? '', status: bm.status ?? null })
        }
      }
    }
  }

  // ── Protocol adjustment helpers ──────────────────────────────

  function getAdjustment(molecule: string): ProtocolAdjustment | undefined {
    return protocolAdjustments.find(a => a.molecule === molecule)
  }

  function setAdjustment(molecule: string, action: ProtocolAdjustment['action'], reason?: string, newDose?: string) {
    setProtocolAdjustments(prev => {
      const existing = prev.findIndex(a => a.molecule === molecule)
      const item: ProtocolAdjustment = { molecule, action, reason: reason ?? '', newDose }
      if (existing >= 0) {
        const next = [...prev]
        next[existing] = item
        return next
      }
      return [...prev, item]
    })
  }

  function removeAdjustment(molecule: string) {
    setProtocolAdjustments(prev => prev.filter(a => a.molecule !== molecule))
  }

  // ── Filtered diagnoses ──────────────────────────────────────

  const filteredCie = diagSearch
    ? CIE10_CODES.filter(c => c.code.toLowerCase().includes(diagSearch.toLowerCase()) || c.label.toLowerCase().includes(diagSearch.toLowerCase()))
    : CIE10_CODES

  // ── Note type labels ──────────────────────────────────────────

  function noteTypeLabel(type: string): string {
    switch (type) {
      case 'soap': return 'Nota SOAP'
      case 'comment': return 'Comentario biomarcador'
      case 'protocol_adjustment': return 'Ajuste de protocolo'
      case 'diagnosis': return 'Diagnosticos CIE-10'
      default: return 'Nota'
    }
  }

  function noteTypeColor(type: string): string {
    switch (type) {
      case 'soap': return 'text-accent'
      case 'comment': return 'text-info'
      case 'protocol_adjustment': return 'text-warning'
      case 'diagnosis': return 'text-danger'
      default: return 'text-muted-foreground'
    }
  }

  // ── Render ──────────────────────────────────────────────────

  return (
    <div className="mt-6 border border-border/40 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-muted/20 border-b border-border/30">
        <div className="flex items-center gap-2">
          <Stethoscope size={15} className="text-accent" />
          <span className="text-sm font-semibold text-foreground">Panel Clinico del Medico</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/30 bg-card">
        {PANEL_TABS.map(tab => {
          const Icon = tab.icon
          const noteCount = notes.filter(n => {
            if (tab.id === 'soap') return n.note_type === 'soap'
            if (tab.id === 'biomarker') return n.note_type === 'comment'
            if (tab.id === 'protocol') return n.note_type === 'protocol_adjustment'
            if (tab.id === 'diagnoses') return n.note_type === 'diagnosis'
            return false
          }).length
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-[11px] font-medium border-b-2 transition-all flex-1 justify-center ${
                activeTab === tab.id
                  ? 'border-accent text-accent'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon size={11} />
              {tab.label}
              {noteCount > 0 && (
                <span className="text-[9px] bg-muted/40 rounded-full px-1.5">{noteCount}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* ═══ SOAP TAB ═══ */}
      {activeTab === 'soap' && (
        <div>
          <div className="px-4 py-2 flex justify-end">
            <button
              onClick={() => setShowSoapForm(!showSoapForm)}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-accent border border-accent/30 rounded-lg hover:bg-accent/10 transition-all"
            >
              <Plus size={12} />
              Nueva nota SOAP
            </button>
          </div>

          {showSoapForm && (
            <div className="px-4 pb-3 space-y-3 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { key: 'subjective', label: 'S — Subjetivo', color: 'text-info', placeholder: 'Lo que el paciente reporta...' },
                  { key: 'objective', label: 'O — Objetivo', color: 'text-accent', placeholder: 'Hallazgos del examen fisico, labs...' },
                  { key: 'assessment', label: 'A — Evaluacion', color: 'text-warning', placeholder: 'Diagnosticos, interpretacion clinica...' },
                  { key: 'plan', label: 'P — Plan', color: 'text-danger', placeholder: 'Plan de tratamiento, proximos pasos...' },
                ].map(field => (
                  <div key={field.key}>
                    <label className={`text-[11px] font-semibold ${field.color} mb-1 block`}>{field.label}</label>
                    <textarea
                      value={soapForm[field.key as keyof typeof soapForm]}
                      onChange={(e) => setSoapForm(f => ({ ...f, [field.key]: e.target.value }))}
                      placeholder={field.placeholder}
                      className="w-full bg-muted/30 border border-border/40 rounded-lg p-2.5 text-xs text-foreground placeholder:text-muted-foreground/50 resize-none h-20 focus:outline-none focus:border-accent/50"
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowSoapForm(false)} className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">Cancelar</button>
                <button onClick={handleSaveSoap} disabled={saving} className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium bg-accent text-background rounded-lg hover:bg-accent/90 disabled:opacity-50">
                  <Send size={11} />
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          )}

          <NotesList notes={notes.filter(n => n.note_type === 'soap')} loading={loading} expandedNote={expandedNote} setExpandedNote={setExpandedNote} noteTypeLabel={noteTypeLabel} noteTypeColor={noteTypeColor} onDelete={deleteNote} />
        </div>
      )}

      {/* ═══ BIOMARKER COMMENTS TAB ═══ */}
      {activeTab === 'biomarker' && (
        <div>
          <div className="px-4 py-2 flex justify-end">
            <button
              onClick={() => setShowBiomarkerForm(!showBiomarkerForm)}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-info border border-info/30 rounded-lg hover:bg-info/10 transition-all"
            >
              <MessageSquare size={12} />
              Comentar biomarcador
            </button>
          </div>

          {showBiomarkerForm && (
            <div className="px-4 pb-3 space-y-3 animate-fade-in">
              <div>
                <label className="text-[11px] font-semibold text-info mb-1.5 block">Biomarcador</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-40 overflow-y-auto">
                  {biomarkerOptions.map(bm => {
                    const statusColor = bm.status === 'danger' ? 'border-red-500/40 bg-red-500/5' :
                      bm.status === 'warning' ? 'border-yellow-500/40 bg-yellow-500/5' :
                      bm.status === 'optimal' ? 'border-emerald-500/40 bg-emerald-500/5' :
                      'border-border/40 bg-muted/10'
                    const isSelected = biomarkerForm.biomarkerKey === bm.key
                    return (
                      <button
                        key={bm.key}
                        onClick={() => setBiomarkerForm(f => ({ ...f, biomarkerKey: bm.key }))}
                        className={`text-left px-2.5 py-1.5 rounded-lg border text-[10px] transition-all ${
                          isSelected ? 'ring-2 ring-accent border-accent' : statusColor
                        }`}
                      >
                        <span className="font-medium text-foreground">{bm.label}</span>
                        <span className="text-muted-foreground ml-1">{bm.value} {bm.unit}</span>
                      </button>
                    )
                  })}
                </div>
                {biomarkerOptions.length === 0 && (
                  <p className="text-[10px] text-muted-foreground">Sin biomarcadores disponibles en este analisis</p>
                )}
              </div>
              <div>
                <label className="text-[11px] font-semibold text-info mb-1 block">Comentario clinico</label>
                <textarea
                  value={biomarkerForm.comment}
                  onChange={(e) => setBiomarkerForm(f => ({ ...f, comment: e.target.value }))}
                  placeholder="Ej: Este LDL requiere estatina por historia familiar de enfermedad coronaria prematura..."
                  className="w-full bg-muted/30 border border-border/40 rounded-lg p-2.5 text-xs text-foreground placeholder:text-muted-foreground/50 resize-none h-16 focus:outline-none focus:border-info/50"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowBiomarkerForm(false)} className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">Cancelar</button>
                <button onClick={handleSaveBiomarkerComment} disabled={saving} className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium bg-info text-background rounded-lg hover:bg-info/90 disabled:opacity-50">
                  <Send size={11} />
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          )}

          <NotesList notes={notes.filter(n => n.note_type === 'comment')} loading={loading} expandedNote={expandedNote} setExpandedNote={setExpandedNote} noteTypeLabel={noteTypeLabel} noteTypeColor={noteTypeColor} onDelete={deleteNote} />
        </div>
      )}

      {/* ═══ PROTOCOL ADJUSTMENTS TAB ═══ */}
      {activeTab === 'protocol' && (
        <div>
          <div className="px-4 py-2 flex justify-end">
            <button
              onClick={() => { setShowProtocolForm(!showProtocolForm); setProtocolAdjustments([]) }}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-warning border border-warning/30 rounded-lg hover:bg-warning/10 transition-all"
            >
              <Edit3 size={12} />
              Revisar protocolo
            </button>
          </div>

          {showProtocolForm && protocol && protocol.length > 0 && (
            <div className="px-4 pb-3 space-y-2 animate-fade-in">
              <p className="text-[10px] text-muted-foreground mb-2">
                Marca cada intervencion del protocolo como aprobada, rechazada o modificada.
              </p>
              <div className="space-y-1.5 max-h-72 overflow-y-auto">
                {protocol.map(item => {
                  const adj = getAdjustment(item.molecule)
                  return (
                    <div key={item.number} className={`rounded-lg border p-2.5 transition-all ${
                      adj?.action === 'approve' ? 'border-emerald-500/30 bg-emerald-500/5' :
                      adj?.action === 'reject' ? 'border-red-500/30 bg-red-500/5' :
                      adj?.action === 'modify' ? 'border-yellow-500/30 bg-yellow-500/5' :
                      'border-border/30 bg-card'
                    }`}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-medium text-foreground">{item.molecule}</span>
                          <span className="text-[10px] text-muted-foreground ml-2">{item.dose}</span>
                          <span className="text-[9px] text-muted-foreground/50 ml-2">{item.category}</span>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={() => adj?.action === 'approve' ? removeAdjustment(item.molecule) : setAdjustment(item.molecule, 'approve', 'Aprobado por el medico')}
                            className={`w-6 h-6 rounded flex items-center justify-center transition-all ${
                              adj?.action === 'approve' ? 'bg-emerald-500 text-white' : 'bg-muted/20 text-muted-foreground hover:text-emerald-400 hover:bg-emerald-500/10'
                            }`}
                            title="Aprobar"
                          >
                            <CheckCircle2 size={12} />
                          </button>
                          <button
                            onClick={() => adj?.action === 'reject' ? removeAdjustment(item.molecule) : setAdjustment(item.molecule, 'reject', '')}
                            className={`w-6 h-6 rounded flex items-center justify-center transition-all ${
                              adj?.action === 'reject' ? 'bg-red-500 text-white' : 'bg-muted/20 text-muted-foreground hover:text-red-400 hover:bg-red-500/10'
                            }`}
                            title="Rechazar"
                          >
                            <XCircle size={12} />
                          </button>
                          <button
                            onClick={() => adj?.action === 'modify' ? removeAdjustment(item.molecule) : setAdjustment(item.molecule, 'modify', '', item.dose)}
                            className={`w-6 h-6 rounded flex items-center justify-center transition-all ${
                              adj?.action === 'modify' ? 'bg-yellow-500 text-white' : 'bg-muted/20 text-muted-foreground hover:text-yellow-400 hover:bg-yellow-500/10'
                            }`}
                            title="Modificar dosis"
                          >
                            <Edit3 size={12} />
                          </button>
                        </div>
                      </div>

                      {/* Reject reason or modify dose */}
                      {adj?.action === 'reject' && (
                        <input
                          type="text"
                          value={adj.reason}
                          onChange={(e) => setAdjustment(item.molecule, 'reject', e.target.value)}
                          placeholder="Razon del rechazo..."
                          className="mt-1.5 w-full bg-red-500/5 border border-red-500/20 rounded px-2 py-1 text-[10px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
                        />
                      )}
                      {adj?.action === 'modify' && (
                        <div className="mt-1.5 flex gap-2">
                          <input
                            type="text"
                            value={adj.newDose ?? ''}
                            onChange={(e) => setAdjustment(item.molecule, 'modify', adj.reason, e.target.value)}
                            placeholder="Nueva dosis..."
                            className="flex-1 bg-yellow-500/5 border border-yellow-500/20 rounded px-2 py-1 text-[10px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
                          />
                          <input
                            type="text"
                            value={adj.reason}
                            onChange={(e) => setAdjustment(item.molecule, 'modify', e.target.value, adj.newDose)}
                            placeholder="Razon..."
                            className="flex-1 bg-yellow-500/5 border border-yellow-500/20 rounded px-2 py-1 text-[10px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {protocolAdjustments.length > 0 && (
                <div className="flex items-center justify-between pt-2">
                  <span className="text-[10px] text-muted-foreground">
                    {protocolAdjustments.filter(a => a.action === 'approve').length} aprobadas,{' '}
                    {protocolAdjustments.filter(a => a.action === 'reject').length} rechazadas,{' '}
                    {protocolAdjustments.filter(a => a.action === 'modify').length} modificadas
                  </span>
                  <div className="flex gap-2">
                    <button onClick={() => { setShowProtocolForm(false); setProtocolAdjustments([]) }} className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">Cancelar</button>
                    <button onClick={handleSaveProtocolAdjustments} disabled={saving} className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium bg-warning text-background rounded-lg hover:bg-warning/90 disabled:opacity-50">
                      <Send size={11} />
                      {saving ? 'Guardando...' : 'Guardar revision'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {showProtocolForm && (!protocol || protocol.length === 0) && (
            <div className="px-4 pb-3 text-center">
              <p className="text-[10px] text-muted-foreground">Sin protocolo disponible en este analisis</p>
            </div>
          )}

          <NotesList notes={notes.filter(n => n.note_type === 'protocol_adjustment')} loading={loading} expandedNote={expandedNote} setExpandedNote={setExpandedNote} noteTypeLabel={noteTypeLabel} noteTypeColor={noteTypeColor} onDelete={deleteNote} />
        </div>
      )}

      {/* ═══ CIE-10 DIAGNOSES TAB ═══ */}
      {activeTab === 'diagnoses' && (
        <div>
          <div className="px-4 py-2 flex justify-end">
            <button
              onClick={() => { setShowDiagnosesForm(!showDiagnosesForm); setSelectedDiagnoses([]) }}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-danger border border-danger/30 rounded-lg hover:bg-danger/10 transition-all"
            >
              <Tag size={12} />
              Agregar diagnosticos
            </button>
          </div>

          {showDiagnosesForm && (
            <div className="px-4 pb-3 space-y-3 animate-fade-in">
              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={diagSearch}
                  onChange={(e) => setDiagSearch(e.target.value)}
                  placeholder="Buscar por codigo o nombre..."
                  className="w-full bg-muted/30 border border-border/40 rounded-lg pl-8 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-danger/50"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 max-h-48 overflow-y-auto">
                {filteredCie.map(cie => {
                  const isSelected = selectedDiagnoses.includes(cie.code)
                  return (
                    <button
                      key={cie.code}
                      onClick={() => setSelectedDiagnoses(prev =>
                        isSelected ? prev.filter(c => c !== cie.code) : [...prev, cie.code]
                      )}
                      className={`text-left px-2.5 py-1.5 rounded-lg border text-[10px] transition-all ${
                        isSelected ? 'ring-2 ring-danger border-danger bg-danger/5' : 'border-border/30 bg-muted/10 hover:bg-muted/20'
                      }`}
                    >
                      <span className="font-mono font-bold text-foreground">{cie.code}</span>
                      <span className="text-muted-foreground ml-1.5">{cie.label}</span>
                    </button>
                  )
                })}
              </div>

              {selectedDiagnoses.length > 0 && (
                <div className="flex items-center justify-between pt-1">
                  <div className="flex flex-wrap gap-1">
                    {selectedDiagnoses.map(code => (
                      <span key={code} className="px-2 py-0.5 rounded bg-danger/10 border border-danger/20 text-[9px] font-mono font-medium text-danger">
                        {code}
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setShowDiagnosesForm(false); setSelectedDiagnoses([]) }} className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">Cancelar</button>
                    <button onClick={handleSaveDiagnoses} disabled={saving} className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium bg-danger text-white rounded-lg hover:bg-danger/90 disabled:opacity-50">
                      <Send size={11} />
                      {saving ? 'Guardando...' : 'Guardar'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <NotesList notes={notes.filter(n => n.note_type === 'diagnosis')} loading={loading} expandedNote={expandedNote} setExpandedNote={setExpandedNote} noteTypeLabel={noteTypeLabel} noteTypeColor={noteTypeColor} onDelete={deleteNote} />
        </div>
      )}
    </div>
  )
}

// ── Notes List Sub-component ────────────────────────────────────

function NotesList({ notes, loading, expandedNote, setExpandedNote, noteTypeLabel, noteTypeColor, onDelete }: {
  notes: ClinicalNote[]
  loading: boolean
  expandedNote: string | null
  setExpandedNote: (id: string | null) => void
  noteTypeLabel: (type: string) => string
  noteTypeColor: (type: string) => string
  onDelete: (noteId: string) => void
}) {
  return (
    <div className="max-h-64 overflow-y-auto">
      {loading ? (
        <div className="p-4 space-y-2">
          <div className="h-10 shimmer rounded-lg" />
          <div className="h-10 shimmer rounded-lg" />
        </div>
      ) : notes.length === 0 ? (
        <div className="p-6 text-center">
          <FileText size={20} className="text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-[10px] text-muted-foreground">Sin notas de este tipo</p>
        </div>
      ) : (
        notes.map(note => (
          <div key={note.id} className="border-b border-border/20 last:border-0">
            <button
              onClick={() => setExpandedNote(expandedNote === note.id ? null : note.id)}
              className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-muted/10 transition-colors text-left"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Clock size={10} className="text-muted-foreground/50 shrink-0" />
                <span className="text-[10px] text-muted-foreground shrink-0">{formatDate(note.created_at)}</span>
                <span className={`text-[9px] font-medium shrink-0 ${noteTypeColor(note.note_type)}`}>{noteTypeLabel(note.note_type)}</span>
                {note.biomarker_key && (
                  <span className="text-[9px] text-info bg-info/10 px-1.5 rounded">{note.biomarker_key}</span>
                )}
                {note.diagnoses && note.diagnoses.length > 0 && (
                  <span className="text-[9px] text-danger bg-danger/10 px-1.5 rounded">{note.diagnoses.length} dx</span>
                )}
                {note.assessment && (
                  <span className="text-[10px] text-foreground/60 truncate">{note.assessment}</span>
                )}
              </div>
              <ChevronDown size={11} className={`text-muted-foreground transition-transform shrink-0 ${expandedNote === note.id ? 'rotate-180' : ''}`} />
            </button>

            {expandedNote === note.id && (
              <div className="px-4 pb-3 animate-fade-in">
                {/* Botón eliminar */}
                <div className="flex justify-end mb-2">
                  <button
                    onClick={() => { if (window.confirm('¿Eliminar esta nota?')) onDelete(note.id) }}
                    className="flex items-center gap-1 px-2 py-1 text-[9px] text-red-400/60 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                  >
                    <Trash2 size={9} />
                    Eliminar
                  </button>
                </div>
                {/* SOAP fields */}
                {note.note_type === 'soap' && (
                  <div className="grid grid-cols-2 gap-2">
                    {note.subjective && <NoteField label="Subjetivo" value={note.subjective} color="text-info" bg="bg-info/5 border-info/10" />}
                    {note.objective && <NoteField label="Objetivo" value={note.objective} color="text-accent" bg="bg-accent/5 border-accent/10" />}
                    {note.assessment && <NoteField label="Evaluacion" value={note.assessment} color="text-warning" bg="bg-warning/5 border-warning/10" />}
                    {note.plan && <NoteField label="Plan" value={note.plan} color="text-danger" bg="bg-danger/5 border-danger/10" />}
                  </div>
                )}

                {/* Biomarker comment */}
                {note.note_type === 'comment' && note.content && (
                  <div className="p-2 rounded bg-info/5 border border-info/10">
                    {note.biomarker_key && <p className="text-[9px] font-mono text-info mb-0.5">{note.biomarker_key}</p>}
                    <p className="text-[11px] text-foreground/70">{note.content}</p>
                  </div>
                )}

                {/* Protocol adjustments */}
                {note.note_type === 'protocol_adjustment' && note.protocol_adjustments && (
                  <div className="space-y-1">
                    {(note.protocol_adjustments as ProtocolAdjustment[]).map((adj, i) => (
                      <div key={i} className={`flex items-center gap-2 px-2 py-1.5 rounded text-[10px] ${
                        adj.action === 'approve' ? 'bg-emerald-500/5 border border-emerald-500/10' :
                        adj.action === 'reject' ? 'bg-red-500/5 border border-red-500/10' :
                        'bg-yellow-500/5 border border-yellow-500/10'
                      }`}>
                        {adj.action === 'approve' && <CheckCircle2 size={10} className="text-emerald-400" />}
                        {adj.action === 'reject' && <XCircle size={10} className="text-red-400" />}
                        {adj.action === 'modify' && <Edit3 size={10} className="text-yellow-400" />}
                        <span className="font-medium text-foreground">{adj.molecule}</span>
                        {adj.action === 'modify' && adj.newDose && <span className="text-yellow-400">→ {adj.newDose}</span>}
                        {adj.reason && <span className="text-muted-foreground">— {adj.reason}</span>}
                      </div>
                    ))}
                  </div>
                )}

                {/* Diagnoses */}
                {note.note_type === 'diagnosis' && note.diagnoses && (
                  <div className="flex flex-wrap gap-1.5">
                    {note.diagnoses.map(code => {
                      const cie = CIE10_CODES.find(c => c.code === code)
                      return (
                        <span key={code} className="px-2 py-1 rounded bg-danger/5 border border-danger/10 text-[10px]">
                          <span className="font-mono font-bold text-danger">{code}</span>
                          {cie && <span className="text-foreground/60 ml-1">{cie.label}</span>}
                        </span>
                      )
                    })}
                  </div>
                )}

                {/* Generic content fallback */}
                {note.content && note.note_type !== 'comment' && note.note_type !== 'protocol_adjustment' && note.note_type !== 'diagnosis' && note.note_type !== 'soap' && (
                  <p className="text-[11px] text-foreground/70 p-2 bg-muted/10 rounded">{note.content}</p>
                )}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  )
}

function NoteField({ label, value, color, bg }: { label: string; value: string; color: string; bg: string }) {
  return (
    <div className={`p-2 rounded border ${bg}`}>
      <p className={`text-[9px] font-semibold ${color} mb-0.5`}>{label}</p>
      <p className="text-[11px] text-foreground/70">{value}</p>
    </div>
  )
}
