'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { User, Calendar, AlertTriangle, Activity, Upload, BarChart2, Trash2, X, TriangleAlert, ShieldOff, Archive, ClipboardList, CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { PatientWithLatestResult } from '@/types'
import { formatDate, getScoreColor } from '@/lib/utils'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface PatientCardProps {
  patient: PatientWithLatestResult
  onDeleted?: () => void
  onUnlinked?: () => void
  viewerRole?: string
}

type DeleteMode = 'full' | 'keep_history'

export function PatientCard({ patient, onDeleted, onUnlinked, viewerRole = 'paciente' }: PatientCardProps) {
  const result = patient.latest_result
  const analysis = result?.ai_analysis
  const score = analysis?.overallScore ?? null
  const alerts = analysis?.keyAlerts?.filter(a => a.level === 'danger' || a.level === 'warning') ?? []

  // Medicos have full control over their own patients, limited on linked ones
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  useState(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setCurrentUserId(user?.id ?? null))
  })
  const isOwnPatient = viewerRole === 'paciente' || (viewerRole === 'medico' && patient.user_id === currentUserId)
  const isLinkedOnly = viewerRole === 'medico' && !isOwnPatient

  const router = useRouter()
  const [showConfirm, setShowConfirm] = useState(false)
  const [showUnlink, setShowUnlink] = useState(false)
  const [showDeleteResult, setShowDeleteResult] = useState(false)
  const [mode, setMode] = useState<DeleteMode>('full')
  const [deleting, setDeleting] = useState(false)
  const [unlinking, setUnlinking] = useState(false)
  const [deletingResult, setDeletingResult] = useState(false)

  async function handleDeleteResult() {
    if (!result || deletingResult) return
    console.log('[DELETE] Iniciando eliminación de resultado:', result.id)
    setDeletingResult(true)
    try {
      // Eliminar archivos del storage
      const fileUrls: string[] = result.file_urls ?? []
      console.log('[DELETE] file_urls:', fileUrls)
      if (fileUrls.length > 0) {
        const paths = fileUrls
          .map((url: string) => {
            const marker = '/lab-files/'
            const idx = url.indexOf(marker)
            return idx !== -1 ? decodeURIComponent(url.slice(idx + marker.length)) : null
          })
          .filter(Boolean) as string[]

        console.log('[DELETE] Storage paths a eliminar:', paths)
        if (paths.length > 0) {
          const storageRes = await supabase.storage.from('lab-files').remove(paths)
          console.log('[DELETE] Storage result:', storageRes)
        }
      }

      // Eliminar registro de lab_results
      console.log('[DELETE] Eliminando registro lab_results id:', result.id)
      const { data, error, count, status, statusText } = await supabase
        .from('lab_results')
        .delete()
        .eq('id', result.id)
        .select()

      console.log('[DELETE] Supabase response:', { data, error, count, status, statusText })

      if (error) throw new Error(error.message)

      // Verificar si realmente se eliminó algo
      if (!data || data.length === 0) {
        console.warn('[DELETE] No se eliminó ningún registro — posible problema de RLS')
        // Intentar con el endpoint API como fallback
        console.log('[DELETE] Intentando via API endpoint...')
        const apiRes = await fetch(`/api/results/${result.id}`, { method: 'DELETE' })
        const apiData = await apiRes.json()
        console.log('[DELETE] API response:', apiRes.status, apiData)
        if (!apiRes.ok) throw new Error(apiData.error || `API error ${apiRes.status}`)
      }

      toast.success('Análisis eliminado')
      setShowDeleteResult(false)
      onDeleted?.()
    } catch (err) {
      console.error('[DELETE] Error:', err)
      toast.error(err instanceof Error ? err.message : 'Error al eliminar análisis')
    } finally {
      setDeletingResult(false)
    }
  }

  async function handleUnlink() {
    setUnlinking(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No autorizado')

      const { error } = await supabase
        .from('patient_medico_links')
        .update({ status: 'revoked' })
        .eq('patient_id', patient.id)
        .eq('medico_user_id', user.id)

      if (error) throw new Error(error.message)
      toast.success(`Desvinculado de ${patient.name}`)
      setShowUnlink(false)
      onUnlinked?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al desvincular')
      setUnlinking(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      if (mode === 'full') {
        // ── Borrar archivos del storage ──────────────────────────
        const { data: allResults } = await supabase
          .from('lab_results')
          .select('file_urls')
          .eq('patient_id', patient.id)

        if (allResults) {
          const paths = allResults
            .flatMap(r => r.file_urls ?? [])
            .map(url => {
              const marker = '/lab-files/'
              const idx = url.indexOf(marker)
              return idx !== -1 ? decodeURIComponent(url.slice(idx + marker.length)) : null
            })
            .filter(Boolean) as string[]

          if (paths.length > 0) {
            await supabase.storage.from('lab-files').remove(paths)
          }
        }

        // ── Borrar paciente (CASCADE elimina lab_results) ────────
        const { error } = await supabase
          .from('patients')
          .delete()
          .eq('id', patient.id)

        if (error) throw new Error(error.message)
        toast.success(`Paciente ${patient.name} y todos sus datos eliminados`)

      } else {
        // ── Desligar los análisis del paciente (patient_id → null) ─
        const { error: unlinkError } = await supabase
          .from('lab_results')
          .update({ patient_id: null })
          .eq('patient_id', patient.id)

        if (unlinkError) throw new Error(unlinkError.message)

        // ── Borrar solo el perfil del paciente ───────────────────
        const { error: deleteError } = await supabase
          .from('patients')
          .delete()
          .eq('id', patient.id)

        if (deleteError) throw new Error(deleteError.message)
        toast.success(`Perfil de ${patient.name} eliminado. Historial de análisis conservado.`)
      }

      setShowConfirm(false)
      onDeleted?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar')
      setDeleting(false)
    }
  }

  return (
    <>
      <div className="card-medical p-5 hover:border-accent/30 hover-lift transition-all duration-200">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center">
              <User size={18} className="text-accent" />
            </div>
            <div>
              <p className="font-semibold text-foreground">{patient.name}</p>
              <p className="text-xs text-muted-foreground font-mono">{patient.code}</p>
            </div>
          </div>
          {isLinkedOnly ? (
            <button
              onClick={() => setShowUnlink(true)}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-warning hover:bg-warning/10 transition-colors"
              title="Desvincular paciente"
            >
              <X size={15} />
            </button>
          ) : onDeleted ? (
            <button
              onClick={() => { setMode('full'); setShowConfirm(true) }}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-danger hover:bg-danger/10 transition-colors"
              title="Eliminar paciente"
            >
              <Trash2 size={15} />
            </button>
          ) : null}
        </div>

        {/* Info */}
        <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
          <span>{patient.age} años</span>
          <span>•</span>
          <span>{patient.gender === 'male' ? 'Masculino' : patient.gender === 'female' ? 'Femenino' : 'Otro'}</span>
          {result && (
            <>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Calendar size={12} />
                {formatDate(result.result_date)}
              </span>
            </>
          )}
        </div>

        {/* Score */}
        {score !== null ? (
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${score}%`, backgroundColor: getScoreColor(score) }}
              />
            </div>
            <span className="text-sm font-mono font-medium" style={{ color: getScoreColor(score) }}>
              {score}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
            <Activity size={14} />
            <span>Sin análisis aún</span>
          </div>
        )}

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap mb-4">
            {alerts.slice(0, 3).map((alert, i) => (
              <Badge key={i} variant={alert.level as 'warning' | 'danger'}>
                <AlertTriangle size={10} className="mr-1" />
                {alert.title}
              </Badge>
            ))}
            {alerts.length > 3 && (
              <Badge variant="default">+{alerts.length - 3} más</Badge>
            )}
          </div>
        )}

        {/* Botones de acción */}
        <div className="flex gap-2 mt-2">
          {isOwnPatient && (
            <Link
              href={`/patients/${patient.id}/upload`}
              className="flex-1 flex items-center justify-center gap-2 bg-accent text-background text-sm font-medium py-2 rounded-lg hover:bg-accent/90 transition-all"
            >
              <Upload size={14} />
              {result ? 'Nuevo Análisis' : 'Analizar'}
            </Link>
          )}
          {result && (
            <Link
              href={`/patients/${patient.id}/dashboard?resultId=${result.id}`}
              className="flex-1 flex items-center justify-center gap-2 border border-border text-foreground text-sm font-medium py-2 rounded-lg hover:bg-muted/40 transition-all"
            >
              <BarChart2 size={14} />
              Dashboard
            </Link>
          )}
        </div>

        {/* Botón historia clínica — pacientes y médicos con pacientes propios */}
        {isOwnPatient && (
          <Link
            href={`/patients/${patient.id}/intake`}
            className="mt-2 w-full flex items-center justify-center gap-2 border border-border text-muted-foreground text-sm py-2 rounded-lg hover:text-foreground hover:border-accent/50 hover:bg-muted/20 transition-all"
          >
            {patient.clinical_history ? (
              <>
                <CheckCircle2 size={13} className="text-accent" />
                <span>Historia Clínica</span>
                <span className="ml-auto text-xs text-accent font-medium">Completada</span>
              </>
            ) : (
              <>
                <ClipboardList size={13} />
                <span>Completar Historia Clínica</span>
                <span className="ml-auto text-xs text-warning font-medium">Pendiente</span>
              </>
            )}
          </Link>
        )}

        {/* Eliminar análisis — esquina inferior derecha */}
        {result && (
          <div className="flex justify-end mt-3">
            <button
              type="button"
              onClick={async (e) => {
                e.preventDefault()
                e.stopPropagation()
                if (!window.confirm(`¿Eliminar el análisis del ${formatDate(result.result_date)}? Esta acción no se puede deshacer.`)) return
                try {
                  // Eliminar archivos del storage
                  const fileUrls: string[] = result.file_urls ?? []
                  if (fileUrls.length > 0) {
                    const paths = fileUrls
                      .map((url: string) => {
                        const marker = '/lab-files/'
                        const idx = url.indexOf(marker)
                        return idx !== -1 ? decodeURIComponent(url.slice(idx + marker.length)) : null
                      })
                      .filter(Boolean) as string[]
                    if (paths.length > 0) await supabase.storage.from('lab-files').remove(paths)
                  }
                  // Eliminar registro
                  const { error } = await supabase.from('lab_results').delete().eq('id', result.id)
                  if (error) throw new Error(error.message)
                  toast.success('Análisis eliminado')
                  onDeleted?.()
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : 'Error al eliminar')
                }
              }}
              className="relative z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground border border-border/40 hover:text-danger hover:border-danger/40 hover:bg-danger/10 transition-all cursor-pointer"
            >
              <Trash2 size={13} />
              <span>Eliminar análisis</span>
            </button>
          </div>
        )}
      </div>

      {/* ── Modal de confirmación ── */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => !deleting && setShowConfirm(false)}
          />
          <div className="relative card-medical w-full max-w-md animate-slide-up p-6 space-y-5">

            {/* Cerrar */}
            <button
              onClick={() => !deleting && setShowConfirm(false)}
              disabled={deleting}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={18} />
            </button>

            {/* Título */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-danger/10 border border-danger/20 flex items-center justify-center shrink-0">
                <TriangleAlert size={18} className="text-danger" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Eliminar paciente</h3>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">{patient.name} · {patient.code}</p>
              </div>
            </div>

            {/* Opciones */}
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              ¿Qué deseas hacer con los datos?
            </p>

            <div className="space-y-2.5">
              {/* Opción A: borrar todo */}
              <button
                onClick={() => setMode('full')}
                disabled={deleting}
                className={`w-full text-left rounded-xl border p-4 transition-all ${
                  mode === 'full'
                    ? 'border-danger/60 bg-danger/8'
                    : 'border-border bg-muted/20 hover:border-danger/30 hover:bg-danger/5'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                    mode === 'full' ? 'border-danger bg-danger' : 'border-muted-foreground'
                  }`}>
                    {mode === 'full' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <ShieldOff size={13} className={mode === 'full' ? 'text-danger' : 'text-muted-foreground'} />
                      <p className="text-sm font-semibold text-foreground">
                        Eliminar paciente y análisis médico
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Borra el perfil del paciente, todos los resultados de laboratorio, los análisis de IA y los archivos almacenados. No queda ningún registro.
                    </p>
                  </div>
                </div>
              </button>

              {/* Opción B: conservar historial */}
              <button
                onClick={() => setMode('keep_history')}
                disabled={deleting}
                className={`w-full text-left rounded-xl border p-4 transition-all ${
                  mode === 'keep_history'
                    ? 'border-warning/60 bg-warning/8'
                    : 'border-border bg-muted/20 hover:border-warning/30 hover:bg-warning/5'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                    mode === 'keep_history' ? 'border-warning bg-warning' : 'border-muted-foreground'
                  }`}>
                    {mode === 'keep_history' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Archive size={13} className={mode === 'keep_history' ? 'text-warning' : 'text-muted-foreground'} />
                      <p className="text-sm font-semibold text-foreground">
                        Eliminar perfil, conservar historial
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Borra el perfil e información personal del paciente, pero conserva en la base de datos el historial completo de análisis médicos de IA y los archivos de laboratorio.
                    </p>
                  </div>
                </div>
              </button>
            </div>

            {/* Botones de acción */}
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={deleting}
                className="flex-1 py-2.5 text-sm font-medium rounded-lg border border-border text-foreground hover:bg-muted/40 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-colors disabled:opacity-60 flex items-center justify-center gap-2 text-white ${
                  mode === 'full'
                    ? 'bg-danger hover:bg-danger/90'
                    : 'bg-warning hover:bg-warning/90'
                }`}
              >
                {deleting ? (
                  <>
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Procesando…
                  </>
                ) : mode === 'full' ? (
                  <>
                    <Trash2 size={14} />
                    Eliminar todo
                  </>
                ) : (
                  <>
                    <Archive size={14} />
                    Conservar historial
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── Modal de desvinculación (médicos) ── */}
      {showUnlink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => !unlinking && setShowUnlink(false)}
          />
          <div className="relative card-medical w-full max-w-sm animate-slide-up p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-warning/10 border border-warning/20 flex items-center justify-center shrink-0">
                <X size={18} className="text-warning" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Desvincular paciente</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{patient.name} · {patient.code}</p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              Dejaras de tener acceso a los analisis de este paciente. El paciente puede volver a invitarte en el futuro.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowUnlink(false)}
                disabled={unlinking}
                className="flex-1 py-2.5 text-sm font-medium rounded-lg border border-border text-foreground hover:bg-muted/40 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleUnlink}
                disabled={unlinking}
                className="flex-1 py-2.5 text-sm font-semibold rounded-lg bg-warning hover:bg-warning/90 text-white transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {unlinking ? (
                  <>
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <X size={14} />
                    Desvincular
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal confirmación eliminar análisis ── */}
      {showDeleteResult && result && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => !deletingResult && setShowDeleteResult(false)}
          />
          <div className="relative bg-card border border-border rounded-2xl w-full max-w-sm animate-slide-up p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-danger/10 border border-danger/20 flex items-center justify-center">
                <Trash2 size={18} className="text-danger" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Eliminar análisis</h3>
                <p className="text-xs text-muted-foreground">{formatDate(result.result_date)} · {patient.name}</p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              Se eliminará permanentemente este análisis, incluyendo los archivos de laboratorio y el reporte de IA. Esta acción no se puede deshacer.
            </p>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowDeleteResult(false)}
                disabled={deletingResult}
                className="flex-1 py-2 text-sm font-medium border border-border rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-all disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteResult}
                disabled={deletingResult}
                className="flex-1 py-2 text-sm font-medium bg-danger text-white rounded-lg hover:bg-danger/90 transition-all disabled:opacity-50"
              >
                {deletingResult ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
