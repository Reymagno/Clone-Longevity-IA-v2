'use client'

import { useState, useEffect, useCallback } from 'react'
import { PatientCard } from '@/components/patients/PatientCard'
import { NewPatientModal } from '@/components/patients/NewPatientModal'
import { Button } from '@/components/ui/button'
import type { PatientWithLatestResult } from '@/types'
import { Plus, Users, Dna, Search, LogOut } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

export default function PatientsPage() {
  const router = useRouter()
  const [patients, setPatients] = useState<PatientWithLatestResult[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [search, setSearch] = useState('')

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const loadPatients = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

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
  }, [])

  useEffect(() => {
    loadPatients()
  }, [loadPatients])

  const filtered = patients.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.code.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center">
              <Dna size={16} className="text-background" />
            </div>
            <span className="font-semibold text-foreground">Longevity IA</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button onClick={() => setShowModal(true)}>
              <Plus size={16} />
              Nuevo Paciente
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout} title="Cerrar sesión">
              <LogOut size={16} />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Título + búsqueda */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Users size={22} className="text-accent" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Pacientes</h1>
              <p className="text-sm text-muted-foreground">{patients.length} paciente{patients.length !== 1 ? 's' : ''} registrado{patients.length !== 1 ? 's' : ''}</p>
            </div>
          </div>

          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por nombre o código..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-muted border border-border rounded-lg pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent transition-colors w-64"
            />
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card-medical p-5 animate-pulse">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-muted" />
                  <div>
                    <div className="h-4 w-28 bg-muted rounded mb-1" />
                    <div className="h-3 w-20 bg-muted rounded" />
                  </div>
                </div>
                <div className="h-2 bg-muted rounded mb-3" />
                <div className="h-2 w-3/4 bg-muted rounded" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Users size={48} className="text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {search ? 'Sin resultados' : 'Sin pacientes aún'}
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              {search
                ? 'No se encontraron pacientes con ese criterio de búsqueda'
                : 'Crea tu primer paciente para comenzar el análisis'}
            </p>
            {!search && (
              <Button onClick={() => setShowModal(true)}>
                <Plus size={16} />
                Crear primer paciente
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {filtered.map((patient) => (
              <PatientCard key={patient.id} patient={patient} onDeleted={loadPatients} />
            ))}
          </div>
        )}
      </div>

      <NewPatientModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onCreated={loadPatients}
      />
    </div>
  )
}
