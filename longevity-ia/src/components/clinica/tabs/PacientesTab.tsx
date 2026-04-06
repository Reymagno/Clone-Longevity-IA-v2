'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Plus, Users, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import type { Patient, Medico } from '@/types'
import { CreatePatientModal } from '../CreatePatientModal'

interface PacientesTabProps {
  patients: Patient[]
  medicos: Medico[]
  onRefresh: () => void
  autoOpenModal?: boolean
  onModalClosed?: () => void
}

export function PacientesTab({ patients, medicos, onRefresh, autoOpenModal, onModalClosed }: PacientesTabProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [filterMedico, setFilterMedico] = useState('all')
  const [showModal, setShowModal] = useState(autoOpenModal ?? false)

  useEffect(() => {
    if (autoOpenModal) setShowModal(true)
  }, [autoOpenModal])

  const medicoOptions = [
    { value: 'all', label: 'Todos los medicos' },
    ...medicos.map((m) => ({ value: m.user_id, label: m.full_name })),
  ]

  const filtered = patients.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.code.toLowerCase().includes(search.toLowerCase())
    const matchesMedico =
      filterMedico === 'all' || p.user_id === filterMedico
    return matchesSearch && matchesMedico
  })

  function getMedicoName(userId: string | null): string {
    if (!userId) return '-'
    const medico = medicos.find((m) => m.user_id === userId)
    return medico?.full_name ?? '-'
  }

  function getGenderLabel(gender: string): string {
    switch (gender) {
      case 'male': return 'M'
      case 'female': return 'F'
      default: return 'O'
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-bold text-foreground">Pacientes</h3>
          <p className="text-sm text-muted-foreground">{patients.length} paciente{patients.length !== 1 ? 's' : ''} en la clinica</p>
        </div>
        <Button
          onClick={() => setShowModal(true)}
          className="bg-amber-500 hover:bg-amber-600 text-background"
        >
          <Plus size={16} />
          Nuevo Paciente
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por nombre o codigo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-muted/40 border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-amber-500/50 focus:bg-muted/60 transition-all"
          />
        </div>
        {medicos.length > 0 && (
          <div className="w-full sm:w-56">
            <Select
              value={filterMedico}
              onChange={(e) => setFilterMedico(e.target.value)}
              options={medicoOptions}
            />
          </div>
        )}
      </div>

      {/* Patient list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Users size={40} className="text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            {search || filterMedico !== 'all' ? 'Sin resultados para los filtros aplicados' : 'No hay pacientes registrados aun'}
          </p>
        </div>
      ) : (
        <div className="card-medical overflow-hidden">
          {/* Table header */}
          <div className="hidden sm:grid sm:grid-cols-12 gap-3 px-4 py-2.5 bg-muted/30 border-b border-border/40 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            <div className="col-span-4">Nombre</div>
            <div className="col-span-2">Codigo</div>
            <div className="col-span-1 text-center">Edad</div>
            <div className="col-span-1 text-center">Genero</div>
            <div className="col-span-3">Medico</div>
            <div className="col-span-1" />
          </div>

          {/* Table rows */}
          <div className="divide-y divide-border/40">
            {filtered.map((patient) => (
              <button
                key={patient.id}
                onClick={() => router.push(`/patients/${patient.id}/dashboard`)}
                className="w-full grid grid-cols-1 sm:grid-cols-12 gap-1 sm:gap-3 px-4 py-3 text-left hover:bg-muted/20 transition-colors group items-center"
              >
                <div className="sm:col-span-4 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-amber-400">
                      {patient.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-foreground truncate">{patient.name}</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-xs font-mono text-muted-foreground">{patient.code}</span>
                </div>
                <div className="sm:col-span-1 text-center">
                  <span className="text-sm text-foreground">{patient.age}</span>
                </div>
                <div className="sm:col-span-1 text-center">
                  <span className="text-xs text-muted-foreground">{getGenderLabel(patient.gender)}</span>
                </div>
                <div className="sm:col-span-3">
                  <span className="text-xs text-muted-foreground truncate">{getMedicoName(patient.user_id)}</span>
                </div>
                <div className="sm:col-span-1 flex justify-end">
                  <ChevronRight size={14} className="text-muted-foreground group-hover:text-amber-400 transition-colors" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      <CreatePatientModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        medicos={medicos}
        onCreated={() => {
          setShowModal(false)
          onRefresh()
        }}
      />
    </div>
  )
}
