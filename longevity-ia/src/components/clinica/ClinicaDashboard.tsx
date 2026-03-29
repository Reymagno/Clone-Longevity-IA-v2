'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import {
  Building2, Users, BarChart2, Stethoscope, FileText, Settings, Clock,
} from 'lucide-react'

interface ClinicaInfo {
  clinic_name: string
  rfc: string
  contact_email: string
  phone: string
  address: string
  director_name: string
}

const UPCOMING_FEATURES = [
  { icon: Stethoscope, title: 'Gestion de Medicos', desc: 'Administra los medicos de tu clinica y sus pacientes vinculados' },
  { icon: Users, title: 'Panel de Pacientes', desc: 'Vista consolidada de todos los pacientes atendidos en la clinica' },
  { icon: BarChart2, title: 'Estadisticas', desc: 'Metricas de uso, analisis realizados, y tendencias de salud' },
  { icon: FileText, title: 'Reportes Institucionales', desc: 'Reportes con marca de la clinica para entrega profesional' },
  { icon: Settings, title: 'Configuracion', desc: 'Logo, colores, datos fiscales y preferencias de la clinica' },
]

export function ClinicaDashboard() {
  const [clinica, setClinica] = useState<ClinicaInfo | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase
        .from('clinicas')
        .select('clinic_name, rfc, contact_email, phone, address, director_name')
        .eq('user_id', user.id)
        .maybeSingle()
        .then(({ data }) => setClinica(data as ClinicaInfo | null))
    })
  }, [])

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Clinica header card */}
      <div className="card-medical p-6 border-t-2 border-t-purple-400/60">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-2xl bg-purple-500/15 border border-purple-500/25 flex items-center justify-center">
            <Building2 size={26} className="text-purple-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">
              {clinica?.clinic_name ?? 'Mi Clinica'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {clinica?.director_name ? `Dir. ${clinica.director_name}` : 'Panel de administracion'}
            </p>
          </div>
        </div>
        {clinica && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-border/40">
            <div className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground block">RFC</span>
              {clinica.rfc}
            </div>
            <div className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground block">Contacto</span>
              {clinica.contact_email}
            </div>
            <div className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground block">Telefono</span>
              {clinica.phone}
            </div>
          </div>
        )}
      </div>

      {/* Coming soon features */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Clock size={16} className="text-muted-foreground" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Proximamente</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {UPCOMING_FEATURES.map((feat, i) => {
            const Icon = feat.icon
            return (
              <div
                key={i}
                className="card-medical p-5 opacity-60 cursor-default"
              >
                <div className="w-10 h-10 rounded-xl bg-muted/40 border border-border/40 flex items-center justify-center mb-3">
                  <Icon size={18} className="text-muted-foreground" />
                </div>
                <h4 className="text-sm font-semibold text-foreground mb-1">{feat.title}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{feat.desc}</p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
