'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { PatientCard } from '@/components/patients/PatientCard'
import { NewPatientModal } from '@/components/patients/NewPatientModal'
import { AnalysisCards } from '@/components/patients/AnalysisCards'
import { Button } from '@/components/ui/button'
import type { Patient, PatientWithLatestResult } from '@/types'
import { Plus, Users, Search, LogOut, Upload, Stethoscope, Bell, Copy, AlertTriangle, Building2, BarChart2, ArrowUpDown } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { LogoIcon } from '@/components/ui/logo-icon'
import { toast } from 'sonner'
import { MedicoLinksPanel } from '@/components/patients/MedicoLinksPanel'
import { InvitationsPanel } from '@/components/medico/InvitationsPanel'
import { AlertsPanel } from '@/components/medico/AlertsPanel'
import { ClinicaDashboard } from '@/components/clinica/ClinicaDashboard'
import { ClinicaLinkPanel } from '@/components/clinica/ClinicaLinkPanel'
import { UserAvatar } from '@/components/profile/UserAvatar'
import { ProfileModal } from '@/components/profile/ProfileModal'
import { AgentChatFloat } from '@/components/chat/AgentChatFloat'

export default function PatientsPage() {
  const router = useRouter()
  const [patients, setPatients] = useState<PatientWithLatestResult[]>([])
  const [singlePatient, setSinglePatient] = useState<Patient | null>(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showMedicoPanel, setShowMedicoPanel] = useState(false)
  const [showInvitations, setShowInvitations] = useState(false)
  const [showAlerts, setShowAlerts] = useState(false)
  const [showClinicaLink, setShowClinicaLink] = useState(false)
  const [pendingInvCount, setPendingInvCount] = useState(0)
  const [alertCount, setAlertCount] = useState(0)
  const [search, setSearch] = useState('')
  const [userRole, setUserRole] = useState<string>('paciente')
  const [medicoCode, setMedicoCode] = useState<string | null>(null)
  const [showProfile, setShowProfile] = useState(false)
  const [userName, setUserName] = useState('')
  const [userAvatar, setUserAvatar] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'name' | 'lastAnalysis' | 'score' | 'recent'>('name')

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
      const role = user.app_metadata?.role ?? user.user_metadata?.role ?? 'paciente'
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

        // Count unread alerts
        const { data: unreadAlerts } = await supabase
          .from('medico_alerts')
          .select('id')
          .eq('medico_user_id', user.id)
          .eq('read', false)
          .eq('dismissed', false)
        setAlertCount(unreadAlerts?.length ?? 0)

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
    } catch {
      toast.error('Error al cargar pacientes')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    loadPatients()
  }, [loadPatients])

  // Fetch user profile for avatar + name
  useEffect(() => {
    fetch('/api/profile')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!data) return
        setUserName(data.full_name || data.clinic_name || data.email || '')
        setUserAvatar(data.avatar_url ?? null)
      })
      .catch(() => {})
  }, [])

  const filtered = patients.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.code.toLowerCase().includes(search.toLowerCase())
  )

  // Greeting based on time of day
  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Buenos dias'
    if (hour < 18) return 'Buenas tardes'
    return 'Buenas noches'
  }, [])

  // Current date formatted in Spanish
  const formattedDate = useMemo(() => {
    return new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  }, [])

  // Analyses this month
  const analysesThisMonth = useMemo(() => {
    const now = new Date()
    return patients.filter(p => p.latest_result && new Date(p.latest_result.created_at).getMonth() === now.getMonth() && new Date(p.latest_result.created_at).getFullYear() === now.getFullYear()).length
  }, [patients])

  // Sorted + filtered patients for medico
  const sortedFiltered = useMemo(() => {
    const arr = [...filtered]
    switch (sortBy) {
      case 'name':
        return arr.sort((a, b) => a.name.localeCompare(b.name))
      case 'lastAnalysis':
        return arr.sort((a, b) => {
          const dateA = a.latest_result?.created_at ? new Date(a.latest_result.created_at).getTime() : 0
          const dateB = b.latest_result?.created_at ? new Date(b.latest_result.created_at).getTime() : 0
          return dateB - dateA
        })
      case 'score':
        return arr.sort((a, b) => {
          const scoreA = (a.latest_result as any)?.health_score ?? 0
          const scoreB = (b.latest_result as any)?.health_score ?? 0
          return scoreB - scoreA
        })
      case 'recent':
        return arr.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      default:
        return arr
    }
  }, [filtered, sortBy])

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
              <UserAvatar
                avatarUrl={userAvatar}
                name={userName}
                size={32}
                onClick={() => setShowProfile(true)}
                className="cursor-pointer hover:ring-2 hover:ring-accent/50 rounded-full transition-all"
              />
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

        <ProfileModal
          isOpen={showProfile}
          onClose={() => setShowProfile(false)}
          onUpdated={({ name, avatarUrl }) => { setUserName(name); setUserAvatar(avatarUrl) }}
        />
      </div>
    )
  }

  // ─── Multiple patients or medico view ────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <div
        className={userRole === 'medico' ? 'backdrop-blur-xl sticky top-0 z-30' : 'border-b border-border/60 bg-card/80 backdrop-blur-xl sticky top-0 z-30'}
        style={userRole === 'medico' ? { background: 'linear-gradient(135deg, #0E1A30 0%, #0A1729 100%)' } : undefined}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <LogoIcon size={32} />
            <div>
              <span className="font-semibold text-foreground tracking-tight block">Longevity IA</span>
              <span className="text-[9px] text-muted-foreground/40 leading-none">Derechos reservados - Longevity Clinic SA de CV</span>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            {userRole === 'medico' && (
              <>
                <Button variant="outline" size="sm" onClick={() => setShowAlerts(true)} className="relative">
                  <AlertTriangle size={14} />
                  <span className="hidden sm:inline">Alertas</span>
                  {alertCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                      {alertCount > 99 ? '99+' : alertCount}
                    </span>
                  )}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowClinicaLink(true)}>
                  <Building2 size={14} />
                  <span className="hidden sm:inline">Mi Clinica</span>
                </Button>
              </>
            )}
            {(userRole === 'paciente' || userRole === 'medico') && (
              <Button onClick={() => setShowModal(true)}>
                <Plus size={16} />
                Nuevo Paciente
              </Button>
            )}
            <UserAvatar
              avatarUrl={userAvatar}
              name={userName}
              size={32}
              onClick={() => setShowProfile(true)}
              className="cursor-pointer hover:ring-2 hover:ring-accent/50 rounded-full transition-all"
            />
            <Button variant="ghost" size="sm" onClick={handleLogout} title="Cerrar sesion">
              <LogOut size={16} />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Welcome section with KPIs for medico */}
        {userRole === 'medico' && (
          <div className="mb-8 rounded-2xl border border-border/40 bg-card/60 backdrop-blur-sm overflow-hidden">
            {/* Welcome row */}
            <div className="px-5 py-4 flex flex-wrap items-center justify-between gap-3 border-b border-border/30">
              <div>
                <h2 className="text-lg font-bold text-foreground">
                  {greeting}, Dr. {userName || 'Medico'}
                </h2>
                <p className="text-xs text-muted-foreground">Panel de gestion de pacientes</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground capitalize">{formattedDate}</span>
                {medicoCode && (
                  <button
                    onClick={() => { navigator.clipboard.writeText(medicoCode); toast.success('Codigo copiado') }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gold-300/10 border border-gold-300/20 text-xs font-mono font-bold text-gold-200 hover:bg-gold-300/20 transition-colors"
                    title="Copiar codigo de medico"
                  >
                    {medicoCode}
                    <Copy size={12} className="text-gold-200/60" />
                  </button>
                )}
              </div>
            </div>
            {/* KPI cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-border/30">
              {/* Total pacientes */}
              <div className="px-4 py-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-accent/15 flex items-center justify-center shrink-0">
                  <Users size={16} className="text-accent" />
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground leading-none">{patients.length}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Pacientes</p>
                </div>
              </div>
              {/* Alertas sin leer */}
              <button
                onClick={() => setShowAlerts(true)}
                className="px-4 py-4 flex items-center gap-3 hover:bg-red-500/5 transition-colors text-left"
              >
                <div className="w-9 h-9 rounded-lg bg-red-500/15 flex items-center justify-center shrink-0">
                  <AlertTriangle size={16} className="text-red-400" />
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground leading-none">{alertCount}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Alertas sin leer</p>
                </div>
              </button>
              {/* Analisis del mes */}
              <div className="px-4 py-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-500/15 flex items-center justify-center shrink-0">
                  <BarChart2 size={16} className="text-blue-400" />
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground leading-none">{analysesThisMonth}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Analisis del mes</p>
                </div>
              </div>
              {/* Invitaciones / Clinica status */}
              {pendingInvCount > 0 ? (
                <button
                  onClick={() => setShowInvitations(true)}
                  className="px-4 py-4 flex items-center gap-3 hover:bg-amber-500/5 transition-colors text-left"
                >
                  <div className="w-9 h-9 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
                    <Bell size={16} className="text-amber-400" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-foreground leading-none">{pendingInvCount}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Invitaciones pendientes</p>
                  </div>
                </button>
              ) : (
                <div className="px-4 py-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                    <Building2 size={16} className="text-amber-400/60" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground leading-none">Sin invitaciones</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Clinica vinculada</p>
                  </div>
                </div>
              )}
            </div>
          </div>
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

          <div className="flex items-center gap-3">
            {userRole === 'medico' && patients.length > 0 && (
              <div className="relative">
                <ArrowUpDown size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="bg-muted/40 border border-border rounded-xl pl-8 pr-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-accent/50 focus:bg-muted/60 transition-all appearance-none cursor-pointer"
                >
                  <option value="name">Nombre A-Z</option>
                  <option value="lastAnalysis">Ultimo analisis</option>
                  <option value="score">Score de salud</option>
                  <option value="recent">Mas reciente</option>
                </select>
              </div>
            )}
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
            {userRole === 'medico' ? (
              <>
                <Stethoscope size={48} className="text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {search ? 'Sin resultados' : 'Comienza tu practica digital'}
                </h3>
                <p className="text-sm text-muted-foreground mb-6">
                  {search
                    ? 'No se encontraron pacientes con ese criterio de busqueda'
                    : 'Crea tu primer paciente o espera invitaciones de pacientes existentes'}
                </p>
                {!search && (
                  <div className="flex items-center gap-3">
                    <Button onClick={() => setShowModal(true)}>
                      <Plus size={16} />
                      Crear Paciente
                    </Button>
                    {medicoCode && (
                      <Button
                        variant="outline"
                        onClick={() => { navigator.clipboard.writeText(medicoCode); toast.success('Codigo copiado al portapapeles') }}
                      >
                        <Copy size={16} />
                        Compartir mi codigo
                      </Button>
                    )}
                  </div>
                )}
              </>
            ) : (
              <>
                <Users size={48} className="text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {search ? 'Sin resultados' : 'Sin pacientes aun'}
                </h3>
                <p className="text-sm text-muted-foreground mb-6">
                  {search
                    ? 'No se encontraron pacientes con ese criterio de busqueda'
                    : 'Crea tu primer paciente para comenzar el analisis'}
                </p>
                {!search && userRole === 'paciente' && (
                  <Button onClick={() => setShowModal(true)}>
                    <Plus size={16} />
                    Crear primer paciente
                  </Button>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {(userRole === 'medico' ? sortedFiltered : filtered).map((patient) => (
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

      {userRole === 'medico' && showAlerts && (
        <AlertsPanel
          onClose={() => setShowAlerts(false)}
          onAlertRead={() => setAlertCount(c => Math.max(0, c - 1))}
        />
      )}

      {userRole === 'medico' && showClinicaLink && (
        <ClinicaLinkPanel onClose={() => setShowClinicaLink(false)} />
      )}

      <ProfileModal
        isOpen={showProfile}
        onClose={() => setShowProfile(false)}
        onUpdated={({ name, avatarUrl }) => { setUserName(name); setUserAvatar(avatarUrl) }}
      />

      {userRole === 'medico' && (
        <AgentChatFloat role="medico" />
      )}
    </div>
  )
}
