'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { PatientCard } from '@/components/patients/PatientCard'
import { NewPatientModal } from '@/components/patients/NewPatientModal'
import { AnalysisCards } from '@/components/patients/AnalysisCards'
import { Button } from '@/components/ui/button'
import type { Patient, PatientWithLatestResult } from '@/types'
import { Plus, Users, Search, LogOut, Upload, Stethoscope, Bell, Copy, Hash } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { LogoIcon } from '@/components/ui/logo-icon'
import { toast } from 'sonner'
import { MedicoLinksPanel } from '@/components/patients/MedicoLinksPanel'
import { InvitationsPanel } from '@/components/medico/InvitationsPanel'
import { ClinicaDashboard } from '@/components/clinica/ClinicaDashboard'

export default function PatientsPage() {
  const router = useRouter()
  const [patients, setPatients] = useState<PatientWithLatestResult[]>([])
  const [singlePatient, setSinglePatient] = useState<Patient | null>(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showMedicoPanel, setShowMedicoPanel] = useState(false)
  const [showInvitations, setShowInvitations] = useState(false)
  const [pendingInvCount, setPendingInvCount] = useState(0)
  const [search, setSearch] = useState('')
  const [userRole, setUserRole] = useState<string>('paciente')
  const [medicoCode, setMedicoCode] = useState<string | null>(null)

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const loadPatients = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      // Check role from user metadata
      const role = user.user_metadata?.role ?? 'paciente'
      setUserRole(role)

      // For medicos: load linked patients + pending invitations
      if (role === 'medico') {
        // Load medico code
        const { data: medicoData } = await supabase
          .from('medicos')
          .select('code')
          .eq('user_id', user.id)
          .maybeSingle()
        setMedicoCode(medicoData?.code ?? null)

        // Count pending invitations
        const { data: pendingLinks } = await supabase
          .from('patient_medico_links')
          .select('id')
          .eq('medico_user_id', user.id)
          .eq('status', 'pending')
        setPendingInvCount(pendingLinks?.length ?? 0)
        if ((pendingLinks?.length ?? 0) > 0) setShowInvitations(true)

        // Load linked patients (from invitations)
        const { data: links } = await supabase
          .from('patient_medico_links')
          .select('patient_id')
          .eq('medico_user_id', user.id)
          .eq('status', 'active')

        const linkedIds = (links ?? []).map(l => l.patient_id)

        // Load own patients (created by the medico)
        const { data: ownPatients } = await supabase
          .from('patients')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        // Load linked patients
        let linkedPatients: typeof ownPatients = []
        if (linkedIds.length > 0) {
          const { data } = await supabase
            .from('patients')
            .select('*')
            .in('id', linkedIds)
            .order('name')
          linkedPatients = data ?? []
        }

        // Merge and deduplicate (own + linked)
        const allPatientsMap = new Map<string, (typeof ownPatients extends (infer T)[] | null ? T : never)>()
        for (const p of (ownPatients ?? [])) allPatientsMap.set(p.id, p)
        for (const p of (linkedPatients ?? [])) if (!allPatientsMap.has(p.id)) allPatientsMap.set(p.id, p)

        const allPatients = Array.from(allPatientsMap.values())

        const withResults = await Promise.all(
          allPatients.map(async (patient) => {
            const { data: results } = await supabase
              .from('lab_results')
              .select('*')
              .eq('patient_id', patient.id)
              .order('result_date', { ascending: false })
              .limit(1)
            return { ...patient, latest_result: results?.[0] || null }
          })
        )
        setPatients(withResults)
        setLoading(false)
        return
      }

      // For clinicas: show placeholder (no patient loading needed)
      if (role === 'clinica') {
        setLoading(false)
        return
      }

      // For pacientes: load own patients
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error?.code === 'PGRST301' || error?.message?.toLowerCase().includes('jwt') || error?.message?.toLowerCase().includes('session')) {
        await supabase.auth.signOut()
        router.replace('/login')
        return
      }

      if (error) throw error

      if (!data || data.length === 0) {
        router.replace('/onboarding')
        return
      }

      // Single patient → show analysis cards view
      if (data.length === 1) {
        setSinglePatient(data[0] as Patient)
        setLoading(false)
        return
      }

      // Multiple patients → show list
      const withResults = await Promise.all(
        (data || []).map(async (patient) => {
          const { data: results } = await supabase
            .from('lab_results')
            .select('*')
            .eq('patient_id', patient.id)
            .order('result_date', { ascending: false })
            .limit(1)
          return { ...patient, latest_result: results?.[0] || null }
        })
      )

      setPatients(withResults)
    } catch (err) {
      console.error('Error cargando pacientes:', err)
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    loadPatients()
  }, [loadPatients])

  const filtered = patients.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.code.toLowerCase().includes(search.toLowerCase())
  )

  // ─── Single patient: Analysis cards view ─────────────────────────
  if (singlePatient) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b border-border/60 bg-card/80 backdrop-blur-xl sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5">
              <LogoIcon size={32} />
              <span className="font-semibold text-foreground tracking-tight">Longevity IA</span>
            </Link>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowMedicoPanel(true)}>
                <Stethoscope size={14} />
                <span className="hidden sm:inline">Mis Medicos</span>
              </Button>
              <Link href={`/patients/${singlePatient.id}/upload`}>
                <Button size="sm">
                  <Upload size={14} />
                  <span className="hidden sm:inline">Nuevo Estudio</span>
                </Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={handleLogout} title="Cerrar sesion">
                <LogOut size={16} />
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground">{singlePatient.name}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {singlePatient.code} · {singlePatient.age} anos · Mis analisis de salud
            </p>
          </div>

          <AnalysisCards patient={singlePatient} />
        </div>

        {showMedicoPanel && (
          <MedicoLinksPanel
            patientId={singlePatient.id}
            patientCode={singlePatient.code}
            onClose={() => setShowMedicoPanel(false)}
          />
        )}
      </div>
    )
  }

  // ─── Multiple patients or medico view ────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border/60 bg-card/80 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <LogoIcon size={32} />
            <span className="font-semibold text-foreground tracking-tight">Longevity IA</span>
          </Link>
          <div className="flex items-center gap-2">
            {userRole === 'medico' && (
              <Button variant="outline" size="sm" onClick={() => setShowInvitations(true)} className="relative">
                <Bell size={14} />
                <span className="hidden sm:inline">Invitaciones</span>
                {pendingInvCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-accent text-background text-[10px] font-bold flex items-center justify-center">
                    {pendingInvCount}
                  </span>
                )}
              </Button>
            )}
            {(userRole === 'paciente' || userRole === 'medico') && (
              <Button onClick={() => setShowModal(true)}>
                <Plus size={16} />
                Nuevo Paciente
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={handleLogout} title="Cerrar sesion">
              <LogOut size={16} />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Código del médico */}
        {userRole === 'medico' && medicoCode && (
          <div className="mb-6 p-4 rounded-xl border border-gold-300/20 bg-gold-300/5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gold-300/15 border border-gold-300/25 flex items-center justify-center shrink-0">
              <Hash size={18} className="text-gold-200" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Tu codigo de medico</p>
              <p className="text-sm font-mono font-bold text-gold-100 tracking-wide">{medicoCode}</p>
            </div>
            <button
              onClick={() => { navigator.clipboard.writeText(medicoCode); toast.success('Codigo copiado') }}
              className="w-9 h-9 flex items-center justify-center rounded-lg bg-muted/40 border border-border/50 text-muted-foreground hover:text-gold-200 hover:border-gold-300/30 transition-colors"
              title="Copiar codigo"
            >
              <Copy size={14} />
            </button>
          </div>
        )}

        {/* Banner de invitaciones pendientes para medicos */}
        {userRole === 'medico' && pendingInvCount > 0 && !showInvitations && (
          <button
            onClick={() => setShowInvitations(true)}
            className="w-full mb-6 p-4 rounded-xl border border-accent/30 bg-accent/8 flex items-center gap-3 hover:bg-accent/12 transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-full bg-accent/15 border border-accent/25 flex items-center justify-center shrink-0">
              <Bell size={18} className="text-accent" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-foreground">
                Tienes {pendingInvCount} invitacion{pendingInvCount !== 1 ? 'es' : ''} pendiente{pendingInvCount !== 1 ? 's' : ''}
              </p>
              <p className="text-xs text-muted-foreground">Pacientes quieren compartir sus analisis contigo</p>
            </div>
            <span className="text-xs text-accent font-medium">Ver &rarr;</span>
          </button>
        )}

        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Users size={22} className="text-accent" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {userRole === 'clinica' ? 'Panel de Clinica' : 'Pacientes'}
              </h1>
              <p className="text-sm text-muted-foreground">
                {patients.length} paciente{patients.length !== 1 ? 's' : ''} registrado{patients.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {patients.length > 0 && (
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar por nombre o codigo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-muted/40 border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50 focus:bg-muted/60 transition-all w-64"
              />
            </div>
          )}
        </div>

        {userRole === 'clinica' ? (
          <ClinicaDashboard />
        ) : loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card-medical p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full shimmer" />
                  <div>
                    <div className="h-4 w-28 shimmer rounded mb-1.5" />
                    <div className="h-3 w-20 shimmer rounded" />
                  </div>
                </div>
                <div className="h-2 shimmer rounded-full mb-3" />
                <div className="h-2 w-3/4 shimmer rounded-full" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Users size={48} className="text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {search ? 'Sin resultados' : 'Sin pacientes aun'}
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              {search
                ? 'No se encontraron pacientes con ese criterio de busqueda'
                : 'Crea tu primer paciente para comenzar el analisis'}
            </p>
            {!search && (userRole === 'paciente' || userRole === 'medico') && (
              <Button onClick={() => setShowModal(true)}>
                <Plus size={16} />
                Crear primer paciente
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {filtered.map((patient) => (
              <PatientCard
                key={patient.id}
                patient={patient}
                viewerRole={userRole}
                onDeleted={loadPatients}
                onUnlinked={userRole === 'medico' ? loadPatients : undefined}
              />
            ))}
          </div>
        )}
      </div>

      {(userRole === 'paciente' || userRole === 'medico') && (
        <NewPatientModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onCreated={loadPatients}
        />
      )}

      {userRole === 'medico' && showInvitations && (
        <InvitationsPanel
          onClose={() => setShowInvitations(false)}
          onAccepted={() => { loadPatients(); setPendingInvCount(c => Math.max(0, c - 1)) }}
        />
      )}
    </div>
  )
}
