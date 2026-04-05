'use client'

import { useState, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/client'
import type { Patient, ProtocolItem } from '@/types'
import {
  generatePrescriptionPDF,
  type PrescriptionItem,
  type CustomItem,
  type MedicoInfo,
  type PrescriptionSignature,
} from '@/lib/prescription-pdf'
import {
  X, FileDown, CheckCircle2, XCircle, Edit3, Plus,
  AlertTriangle, ShieldCheck, Pill, Stethoscope,
  Building2, Trash2, ChevronDown, ChevronRight, Shield,
} from 'lucide-react'
import { SignatureModal } from '@/components/prescription/SignatureModal'

interface PrescriptionBuilderProps {
  patient: Patient
  protocol: ProtocolItem[]
  onClose: () => void
}

type Classification = 'otc' | 'rx' | 'procedure'

const CLASS_CONFIG: Record<Classification, { label: string; icon: typeof Pill; color: string; bg: string }> = {
  otc: { label: 'OTC', icon: Pill, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  rx: { label: 'Rx', icon: ShieldCheck, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
  procedure: { label: 'Procedimiento', icon: Building2, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
}

// Default classification for common categories
function defaultClassification(category: string, molecule: string): Classification {
  const cat = category.toLowerCase()
  const mol = molecule.toLowerCase()
  if (cat.includes('farmacol') || cat.includes('senol') || mol.includes('rapamicina') || mol.includes('metformina') || mol.includes('dasatinib')) return 'rx'
  if (cat.includes('regenerat') || cat.includes('procedimiento') || cat.includes('huc-msc') || mol.includes('msc') || mol.includes('exosoma')) return 'procedure'
  if (cat.includes('péptido') || cat.includes('peptido') || cat.includes('hormonal')) return 'rx'
  return 'otc'
}

// Default supervision flag
function defaultSupervision(classification: Classification, molecule: string): boolean {
  if (classification === 'rx' || classification === 'procedure') return true
  const mol = molecule.toLowerCase()
  if (mol.includes('rapamicina') || mol.includes('metformina') || mol.includes('dasatinib') || mol.includes('quercetin') || mol.includes('fisetin')) return true
  return false
}

interface ProtocolItemState {
  original: ProtocolItem
  status: 'pending' | 'approved' | 'rejected' | 'modified'
  classification: Classification
  requiresSupervision: boolean
  modifiedDose: string
  instructions: string
}

export function PrescriptionBuilder({ patient, protocol, onClose }: PrescriptionBuilderProps) {
  const [medico, setMedico] = useState<MedicoInfo | null>(null)
  const [loadingMedico, setLoadingMedico] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [notes, setNotes] = useState('')

  // Protocol items with state
  const [items, setItems] = useState<ProtocolItemState[]>(() =>
    protocol.map(p => ({
      original: p,
      status: 'pending',
      classification: defaultClassification(p.category, p.molecule),
      requiresSupervision: defaultSupervision(defaultClassification(p.category, p.molecule), p.molecule),
      modifiedDose: p.dose,
      instructions: '',
    }))
  )

  // Custom items added by the medico
  const [customItems, setCustomItems] = useState<CustomItem[]>([])
  const [showAddCustom, setShowAddCustom] = useState(false)
  const [customForm, setCustomForm] = useState<CustomItem>({
    molecule: '', dose: '', classification: 'otc', requiresSupervision: false, instructions: '',
  })

  // Expanded items
  const [expandedItem, setExpandedItem] = useState<number | null>(null)

  // Signature state
  const [showSignModal, setShowSignModal] = useState(false)
  const [signatureData, setSignatureData] = useState<PrescriptionSignature | null>(null)
  const [signingPdf, setSigningPdf] = useState(false)

  // Load medico data
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user || cancelled) return
        const { data } = await supabase
          .from('medicos')
          .select('full_name, specialty, license_number, email')
          .eq('user_id', user.id)
          .maybeSingle()
        if (data && !cancelled) {
          setMedico({
            fullName: data.full_name,
            specialty: data.specialty,
            licenseNumber: data.license_number,
            email: data.email,
          })
        }
      } catch {
        // Error cargando datos del médico
      } finally {
        if (!cancelled) setLoadingMedico(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  // Computed counts
  const counts = useMemo(() => {
    const approved = items.filter(i => i.status === 'approved').length
    const modified = items.filter(i => i.status === 'modified').length
    const rejected = items.filter(i => i.status === 'rejected').length
    const pending = items.filter(i => i.status === 'pending').length
    return { approved, modified, rejected, pending, custom: customItems.length, total: approved + modified + customItems.length }
  }, [items, customItems])

  function updateItem(index: number, updates: Partial<ProtocolItemState>) {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, ...updates } : item))
  }

  function approveAll() {
    setItems(prev => prev.map(item => item.status === 'pending' ? { ...item, status: 'approved' } : item))
  }

  function addCustomItem() {
    if (!customForm.molecule || !customForm.dose) {
      toast.error('Molecula y dosis son obligatorios')
      return
    }
    setCustomItems(prev => [...prev, { ...customForm }])
    setCustomForm({ molecule: '', dose: '', classification: 'otc', requiresSupervision: false, instructions: '' })
    setShowAddCustom(false)
    toast.success('Intervencion agregada')
  }

  function removeCustomItem(index: number) {
    setCustomItems(prev => prev.filter((_, i) => i !== index))
  }

  // Build prescription items for PDF/CDA
  function buildPrescriptionItems(): PrescriptionItem[] {
    return items
      .filter(i => i.status === 'approved' || i.status === 'modified')
      .map(i => ({
        molecule: i.original.molecule,
        dose: i.status === 'modified' ? i.modifiedDose : i.original.dose,
        category: i.original.category,
        classification: i.classification,
        requiresSupervision: i.requiresSupervision,
        status: i.status as 'approved' | 'modified',
        originalDose: i.status === 'modified' ? i.original.dose : undefined,
        instructions: i.instructions || undefined,
        mechanism: i.original.mechanism,
        evidence: i.original.evidence,
      }))
  }

  // Build cadena original for signing
  function buildCadena(): { cadena: string; verificationCode: string; prescriptionId: string } {
    const prescriptionItems = buildPrescriptionItems()
    const allForCadena = [
      ...prescriptionItems.map(it => ({ molecule: it.molecule, dose: it.dose, classification: it.classification })),
      ...customItems.map(it => ({ molecule: it.molecule, dose: it.dose, classification: it.classification })),
    ]
    const prescriptionId = crypto.randomUUID()
    // Inline verification code generation (same as prescription-cda.ts)
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code = 'RX-'
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]

    const parts = [
      '', '1.0', prescriptionId, code, new Date().toISOString(),
      medico?.fullName ?? '', medico?.licenseNumber ?? '', medico?.specialty ?? '', medico?.email ?? '',
      patient.name, String(patient.age), patient.gender,
      ...allForCadena.map(it => `${it.molecule}|${it.dose}|${it.classification}`),
      '',
    ]
    return { cadena: parts.join('||'), verificationCode: code, prescriptionId }
  }

  // Handle signature result from modal
  async function handleSignatureResult(result: {
    signatureBase64: string
    digestHex: string
    certificate: { serialNumber: string; subject: string; issuer: string; validFrom: string; validTo: string; rfc: string | null; pemBase64: string }
  }) {
    const { cadena, verificationCode, prescriptionId } = buildCadena()
    const verifyUrl = `${window.location.origin}/verify/${verificationCode}`

    const sig: PrescriptionSignature = {
      signedAt: new Date().toISOString(),
      certificateSubject: result.certificate.subject,
      certificateSerial: result.certificate.serialNumber,
      certificateIssuer: result.certificate.issuer,
      certificateValidFrom: result.certificate.validFrom,
      certificateValidTo: result.certificate.validTo,
      rfc: result.certificate.rfc ?? undefined,
      digestSha256: result.digestHex,
      verificationCode,
      verifyUrl,
    }
    setSignatureData(sig)

    // Store signature on server
    try {
      const { generatePrescriptionCDA } = await import('@/lib/cda/prescription-cda')
      const cdaXml = generatePrescriptionCDA(
        { documentId: prescriptionId, verificationCode, createdAt: new Date().toISOString(), languageCode: 'es-MX' },
        medico!,
        patient,
        buildPrescriptionItems(),
        customItems,
        notes,
        {
          signedAt: sig.signedAt,
          certificateSerial: sig.certificateSerial,
          certificateSubject: sig.certificateSubject,
          certificateIssuer: sig.certificateIssuer,
          certificateValidFrom: sig.certificateValidFrom,
          certificateValidTo: sig.certificateValidTo,
          signatureValue: result.signatureBase64,
          digestValue: result.digestHex,
          rfc: result.certificate.rfc ?? undefined,
        },
      )

      await fetch('/api/prescriptions/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prescriptionId,
          patientId: patient.id,
          cdaXml,
          cadenaOriginal: cadena,
          digestSha256: result.digestHex,
          signatureBase64: result.signatureBase64,
          certificateSerial: result.certificate.serialNumber,
          certificateSubject: result.certificate.subject,
          certificateIssuer: result.certificate.issuer,
          certificateValidFrom: result.certificate.validFrom,
          certificateValidTo: result.certificate.validTo,
          certificatePem: result.certificate.pemBase64,
          verificationCode,
          rfc: result.certificate.rfc,
        }),
      })
    } catch (err) {
      console.error('[PrescriptionBuilder] Error storing signature:', err)
      // Non-blocking: signature is still valid locally even if server storage fails
    }
  }

  // Generate PDF with optional signature
  async function handleGenerateWithSignature() {
    if (!medico) { toast.error('No se pudo cargar la informacion del medico'); return }
    if (counts.total === 0) { toast.error('Aprueba o agrega al menos una intervencion'); return }

    setSigningPdf(true)
    try {
      const today = new Date()
      const dateStr = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`

      await generatePrescriptionPDF({
        patient, medico,
        items: buildPrescriptionItems(),
        customItems, notes, date: dateStr,
        signature: signatureData ?? undefined,
      })
      toast.success('Prescripcion PDF firmada generada')
    } catch {
      toast.error('Error al generar la prescripcion')
    } finally {
      setSigningPdf(false)
    }
  }

  async function handleGenerate() {
    if (!medico) {
      toast.error('No se pudo cargar la informacion del medico')
      return
    }
    if (counts.total === 0) {
      toast.error('Aprueba o agrega al menos una intervencion')
      return
    }

    setGenerating(true)
    try {
      const approvedItems = items.filter(i => i.status === 'approved' || i.status === 'modified')
      const prescriptionItems: PrescriptionItem[] = approvedItems.map(i => ({
          molecule: i.original.molecule,
          dose: i.status === 'modified' ? i.modifiedDose : i.original.dose,
          category: i.original.category,
          classification: i.classification,
          requiresSupervision: i.requiresSupervision,
          status: i.status as 'approved' | 'modified',
          originalDose: i.status === 'modified' ? i.original.dose : undefined,
          instructions: i.instructions || undefined,
          mechanism: i.original.mechanism,
          evidence: i.original.evidence,
        }))

      const today = new Date()
      const dateStr = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`

      await generatePrescriptionPDF({
        patient,
        medico,
        items: prescriptionItems,
        customItems,
        notes,
        date: dateStr,
      })

      toast.success('Prescripcion PDF generada')
    } catch {
      toast.error('Error al generar la prescripción')
    } finally {
      setGenerating(false)
    }
  }

  if (loadingMedico) {
    return (
      <div className="fixed inset-0 z-[100]">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-card rounded-xl p-8 text-center">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Cargando datos del medico...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="absolute top-4 left-4 right-4 sm:top-8 sm:left-[10%] sm:right-[10%] max-h-[85vh] bg-card rounded-2xl border border-border/60 shadow-2xl flex flex-col overflow-hidden animate-scale-in">
        {/* ═══ Header ════════════════════════════════════════════ */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/40 bg-card shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/15 border border-accent/25 flex items-center justify-center">
              <Stethoscope size={18} className="text-accent" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">Prescripcion Digital</h2>
              <p className="text-[10px] text-muted-foreground">
                {medico ? `Dr. ${medico.fullName} — Cedula: ${medico.licenseNumber}` : 'Medico no configurado'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Summary badges */}
            <div className="hidden sm:flex items-center gap-2">
              {counts.approved > 0 && <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">{counts.approved} aprobadas</span>}
              {counts.modified > 0 && <span className="text-[9px] px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">{counts.modified} modificadas</span>}
              {counts.rejected > 0 && <span className="text-[9px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">{counts.rejected} rechazadas</span>}
              {counts.custom > 0 && <span className="text-[9px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">{counts.custom} propias</span>}
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted/30 transition-colors">
              <X size={16} className="text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* ═══ Content ═══════════════════════════════════════════ */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

          {/* Quick actions */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Paciente: <strong className="text-foreground">{patient.name}</strong> ({patient.age} anos)
            </p>
            <div className="flex gap-2">
              <button
                onClick={approveAll}
                className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium text-emerald-400 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/10 transition-all"
              >
                <CheckCircle2 size={10} />
                Aprobar todas
              </button>
              <button
                onClick={() => setShowAddCustom(true)}
                className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-500/10 transition-all"
              >
                <Plus size={10} />
                Agregar intervencion
              </button>
            </div>
          </div>

          {/* ── Protocol items ──────────────────────────────── */}
          <div className="space-y-1.5">
            <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Pill size={12} className="text-accent" />
              Protocolo de IA ({protocol.length} intervenciones)
            </h3>

            {items.map((item, idx) => {
              const isExpanded = expandedItem === idx
              const classCfg = CLASS_CONFIG[item.classification]
              const ClassIcon = classCfg.icon

              return (
                <div key={idx} className={`rounded-lg border transition-all ${
                  item.status === 'approved' ? 'border-emerald-500/30 bg-emerald-500/3' :
                  item.status === 'rejected' ? 'border-red-500/30 bg-red-500/3 opacity-50' :
                  item.status === 'modified' ? 'border-yellow-500/30 bg-yellow-500/3' :
                  'border-border/30 bg-card'
                }`}>
                  {/* Row header */}
                  <div className="flex items-center gap-2 px-3 py-2">
                    {/* Approve/Reject/Modify */}
                    <div className="flex gap-0.5 shrink-0">
                      <button
                        onClick={() => updateItem(idx, { status: item.status === 'approved' ? 'pending' : 'approved' })}
                        className={`w-6 h-6 rounded flex items-center justify-center transition-all ${
                          item.status === 'approved' ? 'bg-emerald-500 text-white' : 'bg-muted/20 text-muted-foreground hover:text-emerald-400'
                        }`}
                        title="Aprobar"
                      >
                        <CheckCircle2 size={11} />
                      </button>
                      <button
                        onClick={() => updateItem(idx, { status: item.status === 'rejected' ? 'pending' : 'rejected' })}
                        className={`w-6 h-6 rounded flex items-center justify-center transition-all ${
                          item.status === 'rejected' ? 'bg-red-500 text-white' : 'bg-muted/20 text-muted-foreground hover:text-red-400'
                        }`}
                        title="Rechazar"
                      >
                        <XCircle size={11} />
                      </button>
                      <button
                        onClick={() => updateItem(idx, { status: item.status === 'modified' ? 'pending' : 'modified' })}
                        className={`w-6 h-6 rounded flex items-center justify-center transition-all ${
                          item.status === 'modified' ? 'bg-yellow-500 text-white' : 'bg-muted/20 text-muted-foreground hover:text-yellow-400'
                        }`}
                        title="Modificar dosis"
                      >
                        <Edit3 size={11} />
                      </button>
                    </div>

                    {/* Molecule info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-foreground truncate">{item.original.molecule}</span>
                        <span className="text-[9px] text-muted-foreground/60">{item.original.category}</span>
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground">{item.original.dose}</span>
                    </div>

                    {/* Classification */}
                    <select
                      value={item.classification}
                      onChange={(e) => {
                        const cls = e.target.value as Classification
                        updateItem(idx, {
                          classification: cls,
                          requiresSupervision: defaultSupervision(cls, item.original.molecule),
                        })
                      }}
                      className={`text-[9px] font-medium px-2 py-0.5 rounded border ${classCfg.bg} ${classCfg.color} bg-transparent cursor-pointer focus:outline-none`}
                    >
                      <option value="otc">OTC</option>
                      <option value="rx">Rx</option>
                      <option value="procedure">Procedimiento</option>
                    </select>

                    {/* Supervision toggle */}
                    <button
                      onClick={() => updateItem(idx, { requiresSupervision: !item.requiresSupervision })}
                      className={`w-6 h-6 rounded flex items-center justify-center transition-all ${
                        item.requiresSupervision ? 'bg-red-500/20 text-red-400' : 'bg-muted/20 text-muted-foreground/30'
                      }`}
                      title={item.requiresSupervision ? 'Requiere supervision' : 'Sin supervision'}
                    >
                      <AlertTriangle size={10} />
                    </button>

                    {/* Expand */}
                    <button
                      onClick={() => setExpandedItem(isExpanded ? null : idx)}
                      className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground"
                    >
                      {isExpanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                    </button>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="px-3 pb-2.5 space-y-2 animate-fade-in border-t border-border/20 pt-2">
                      {item.status === 'modified' && (
                        <div>
                          <label className="text-[9px] font-semibold text-yellow-400 mb-0.5 block">Nueva dosis</label>
                          <input
                            type="text"
                            value={item.modifiedDose}
                            onChange={(e) => updateItem(idx, { modifiedDose: e.target.value })}
                            className="w-full bg-yellow-500/5 border border-yellow-500/20 rounded px-2.5 py-1.5 text-xs text-foreground focus:outline-none"
                          />
                        </div>
                      )}
                      <div>
                        <label className="text-[9px] font-semibold text-muted-foreground mb-0.5 block">Instrucciones adicionales</label>
                        <input
                          type="text"
                          value={item.instructions}
                          onChange={(e) => updateItem(idx, { instructions: e.target.value })}
                          placeholder="Ej: Tomar con alimentos, separar 2h de otros suplementos..."
                          className="w-full bg-muted/20 border border-border/30 rounded px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none"
                        />
                      </div>
                      <div className="text-[9px] text-muted-foreground/60">
                        <strong>Mecanismo:</strong> {item.original.mechanism}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* ── Custom items ───────────────────────────────── */}
          {customItems.length > 0 && (
            <div className="space-y-1.5">
              <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Plus size={12} className="text-blue-400" />
                Intervenciones del medico ({customItems.length})
              </h3>
              {customItems.map((ci, idx) => {
                const classCfg = CLASS_CONFIG[ci.classification]
                return (
                  <div key={idx} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-blue-500/30 bg-blue-500/3">
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-medium text-foreground">{ci.molecule}</span>
                      <span className="text-[10px] font-mono text-muted-foreground ml-2">{ci.dose}</span>
                      {ci.instructions && <p className="text-[9px] text-muted-foreground/60 mt-0.5">{ci.instructions}</p>}
                    </div>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded border ${classCfg.bg} ${classCfg.color}`}>{classCfg.label}</span>
                    {ci.requiresSupervision && <AlertTriangle size={10} className="text-red-400" />}
                    <button onClick={() => removeCustomItem(idx)} className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-red-400">
                      <Trash2 size={10} />
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {/* ── Add custom form ────────────────────────────── */}
          {showAddCustom && (
            <div className="rounded-xl border border-blue-500/30 bg-blue-500/3 p-4 space-y-3 animate-fade-in">
              <h4 className="text-xs font-semibold text-blue-400">Agregar intervencion propia</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-semibold text-muted-foreground mb-0.5 block">Molecula / Intervencion *</label>
                  <input type="text" value={customForm.molecule} onChange={(e) => setCustomForm(f => ({ ...f, molecule: e.target.value }))} placeholder="Ej: Atorvastatina" className="w-full bg-muted/20 border border-border/30 rounded px-2.5 py-1.5 text-xs text-foreground focus:outline-none" />
                </div>
                <div>
                  <label className="text-[9px] font-semibold text-muted-foreground mb-0.5 block">Dosis *</label>
                  <input type="text" value={customForm.dose} onChange={(e) => setCustomForm(f => ({ ...f, dose: e.target.value }))} placeholder="Ej: 20mg 1x/dia" className="w-full bg-muted/20 border border-border/30 rounded px-2.5 py-1.5 text-xs text-foreground focus:outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[9px] font-semibold text-muted-foreground mb-0.5 block">Clasificacion</label>
                  <select value={customForm.classification} onChange={(e) => setCustomForm(f => ({ ...f, classification: e.target.value as Classification }))} className="w-full bg-muted/20 border border-border/30 rounded px-2.5 py-1.5 text-xs text-foreground focus:outline-none">
                    <option value="otc">OTC (Venta libre)</option>
                    <option value="rx">Rx (Con receta)</option>
                    <option value="procedure">Procedimiento</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-semibold text-muted-foreground mb-0.5 block">Instrucciones</label>
                  <input type="text" value={customForm.instructions} onChange={(e) => setCustomForm(f => ({ ...f, instructions: e.target.value }))} placeholder="Opcional..." className="w-full bg-muted/20 border border-border/30 rounded px-2.5 py-1.5 text-xs text-foreground focus:outline-none" />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={customForm.requiresSupervision} onChange={(e) => setCustomForm(f => ({ ...f, requiresSupervision: e.target.checked }))} className="rounded" />
                    <span className="text-[9px] text-muted-foreground">Supervision medica</span>
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowAddCustom(false)} className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">Cancelar</button>
                <button onClick={addCustomItem} className="flex items-center gap-1 px-4 py-1.5 text-xs font-medium bg-blue-500 text-white rounded-lg hover:bg-blue-500/90">
                  <Plus size={11} />
                  Agregar
                </button>
              </div>
            </div>
          )}

          {/* ── Notes ──────────────────────────────────────── */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Notas y observaciones</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Indicaciones generales, restricciones, proxima cita..."
              className="w-full bg-muted/20 border border-border/30 rounded-lg p-3 text-xs text-foreground placeholder:text-muted-foreground/40 resize-none h-16 focus:outline-none focus:border-accent/50"
            />
          </div>
        </div>

        {/* ═══ Footer ════════════════════════════════════════════ */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-border/40 bg-card shrink-0">
          <div className="text-[10px] text-muted-foreground">
            {counts.total > 0
              ? `${counts.total} intervenciones seran incluidas en la prescripcion`
              : 'Aprueba o agrega intervenciones para generar la prescripcion'
            }
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
              Cancelar
            </button>

            {/* Botón Firmar — abre modal de firma electrónica */}
            {!signatureData && (
              <button
                onClick={() => setShowSignModal(true)}
                disabled={counts.total === 0}
                className="flex items-center gap-2 px-4 py-2 text-xs font-medium border border-emerald-500/30 text-emerald-400 rounded-lg hover:bg-emerald-500/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <Shield size={13} />
                Firmar
              </button>
            )}

            {/* Indicador de firma aplicada */}
            {signatureData && (
              <div className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                <CheckCircle2 size={12} />
                Firmada
              </div>
            )}

            {/* Generar PDF (con o sin firma) */}
            <button
              onClick={signatureData ? handleGenerateWithSignature : handleGenerate}
              disabled={(generating || signingPdf) || counts.total === 0}
              className="flex items-center gap-2 px-5 py-2 text-xs font-medium bg-accent text-background rounded-lg hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-accent/20 shadow-lg"
            >
              <FileDown size={13} />
              {(generating || signingPdf)
                ? 'Generando PDF...'
                : signatureData
                  ? 'Descargar PDF Firmado'
                  : 'Generar Prescripcion PDF'
              }
            </button>
          </div>
        </div>

        {/* Modal de firma electrónica */}
        <SignatureModal
          isOpen={showSignModal}
          onClose={() => setShowSignModal(false)}
          onSigned={(result) => {
            setShowSignModal(false)
            handleSignatureResult(result)
          }}
          cadenaOriginal={buildCadena().cadena}
        />
      </div>
    </div>
  )
}
