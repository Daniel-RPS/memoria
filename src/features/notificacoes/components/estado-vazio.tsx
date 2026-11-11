import { Bell } from 'lucide-react'
import { GlassCard } from '@/components/ui/glass-card'

/** Sem nenhum aviso: uma linha simpática dizendo como agendar. */
export function EstadoVazio() {
  return (
    <GlassCard className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-accent text-caneta">
        <Bell aria-hidden className="size-5" />
      </span>
      <p className="text-lg font-semibold">Tudo quieto por aqui</p>
      <p className="max-w-sm text-sm text-grafite">
        Para ser lembrado, abra o menu ⋯ de uma tarefa e escolha <strong>Notificar</strong>, ou use
        o sino da captura rápida no Início.
      </p>
    </GlassCard>
  )
}
