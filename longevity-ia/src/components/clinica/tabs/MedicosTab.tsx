'use client'

import { useState, useEffect } from 'react'
import { Search, Plus, Stethoscope, Mail, Hash, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Medico } from '@/types'
import { CreateMedicoModal } from '../CreateMedicoModal'

interface MedicosTabProps {
  medicos: Medico[]
  onRefresh: () => void
  autoOpenModal?: boolean
  onModalClosed?: () => void
}

export function MedicosTab({ medicos, onRefresh, autoOpenModal, onModalClosed }: MedicosTabProps) {
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(autoOpenModal ?? false)

  // Auto-open modal from quick action
  useEffect(() => {
    if (autoOpenModal) {
      setShowModal(true)
    }
  }, [autoOpenModal])

  const filtered = medicos.filter((m) =>
    m.full_name.toLowerCase().includes(search.toLowerCase()) ||
    m.specialty.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-bold text-foreground">Medicos del Staff</h3>
          <p className="text-sm text-muted-foreground">{medicos.length} medico{medicos.length !== 1 ? 's' : ''} registrado{medicos.length !== 1 ? 's' : ''}</p>
        </div>
        <Button
          onClick={() => setShowModal(true)}
          className="bg-amber-500 hover:bg-amber-600 text-background"
        >
          <Plus size={16} />
          Nuevo Medico
        </Button>
      </div>

      {/* Search */}
      {medicos.length > 0 && (
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por nombre o especialidad..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-muted/40 border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-amber-500/50 focus:bg-muted/60 transition-all"
          />
        </div>
      )}

      {/* Medico cards */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Stethoscope size={40} className="text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            {search ? 'Sin resultados para tu busqueda' : 'No hay medicos registrados aun'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((medico) => (
            <div key={medico.id} className="card-medical p-5 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                  <span className="text-base font-bold text-amber-400">
                    {medico.full_name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">{medico.full_name}</p>
                  <p className="text-xs text-muted-foreground">{medico.specialty}</p>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Mail size={12} className="shrink-0" />
                  <span className="truncate">{medico.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Stethoscope size={12} className="shrink-0" />
                  <span>Ced. {medico.license_number}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs font-mono px-2 py-1 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                  <Hash size={10} />
                  {medico.code}
                </span>
                <span className="text-xs px-2 py-1 rounded-md bg-muted/60 text-muted-foreground border border-border/40 flex items-center gap-1 ml-auto">
                  <Users size={10} />
                  {medico.patient_count ?? 0} pacientes
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <CreateMedicoModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onCreated={() => {
          setShowModal(false)
          onRefresh()
        }}
      />
    </div>
  )
}
