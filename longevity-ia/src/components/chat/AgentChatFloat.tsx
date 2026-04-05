'use client'

import { useState } from 'react'
import { X, BotMessageSquare } from 'lucide-react'
import { AgentChat } from './AgentChat'

interface Props {
  role: 'medico' | 'clinica'
}

/**
 * Wrapper flotante para el AgentChat.
 * Muestra un botón en la esquina inferior que abre el panel del agente.
 * Se usa en el panel de médico donde no hay tabs para embeber el chat.
 */
export function AgentChatFloat({ role }: Props) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Panel flotante */}
      <div
        aria-label="Asistente Inteligente"
        className={`
          fixed z-50 flex flex-col rounded-2xl border border-border/60 bg-card/95 backdrop-blur-xl shadow-2xl overflow-hidden
          transition-all duration-300 ease-out origin-bottom-right
          bottom-[5.5rem] right-4 sm:right-6
          w-[calc(100vw-2rem)] sm:w-[520px]
          ${isOpen
            ? 'opacity-100 scale-100 pointer-events-auto translate-y-0'
            : 'opacity-0 scale-95 pointer-events-none translate-y-3'
          }
        `}
        style={{ maxHeight: 'calc(100vh - 7rem)', height: 'calc(100vh - 7rem)' }}
      >
        {isOpen && <AgentChat role={role} />}
      </div>

      {/* Botón flotante */}
      <button
        onClick={() => setIsOpen(v => !v)}
        aria-label={isOpen ? 'Cerrar Asistente IA' : 'Abrir Asistente IA'}
        className={`
          fixed bottom-6 right-4 sm:right-6 z-50
          flex items-center gap-2.5 px-5 py-3.5 rounded-2xl font-semibold text-sm
          shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95
          ${isOpen
            ? 'bg-card/90 backdrop-blur-xl border border-border/60 text-muted-foreground hover:text-foreground'
            : 'bg-accent text-background'
          }
        `}
        style={
          !isOpen
            ? { boxShadow: '0 0 32px #2EAE7B44, 0 8px 40px rgba(0,0,0,0.5)' }
            : undefined
        }
      >
        {isOpen ? (
          <>
            <X size={16} />
            Cerrar
          </>
        ) : (
          <>
            <BotMessageSquare size={18} />
            Asistente IA
          </>
        )}
      </button>
    </>
  )
}
