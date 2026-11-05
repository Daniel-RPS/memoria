import { ChevronRight } from 'lucide-react'
import { cn } from 'cn'
import { textoProgresso, type Progresso } from '@/lib/tarefas'

interface BotaoProgressoProps {
  progresso: Progresso
  tituloTarefa: string
  isAberto: boolean
  idPainel: string
  onAlternar: () => void
  /** Semana: texto e chevron menores. */
  isCompacto?: boolean
}

/** "1/3" ao lado do título; abre e fecha as subetapas. */
export function BotaoProgresso({
  progresso,
  tituloTarefa,
  isAberto,
  idPainel,
  onAlternar,
  isCompacto = false,
}: BotaoProgressoProps) {
  const isCompleto = progresso.concluidas === progresso.total

  return (
    <button
      type="button"
      onClick={onAlternar}
      aria-expanded={isAberto}
      aria-controls={idPainel}
      aria-label={`Subetapas de ${tituloTarefa}: ${progresso.concluidas} de ${progresso.total} concluídas`}
      className={cn(
        'flex items-center gap-0.5 rounded-sm whitespace-nowrap tabular-nums hover:text-tinta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-caneta',
        isCompacto ? 'text-xs' : 'text-sm',
        isCompleto ? 'text-caneta' : 'text-grafite',
      )}
    >
      {textoProgresso(progresso)}
      <ChevronRight
        aria-hidden
        className={cn(
          'transition-transform motion-reduce:transition-none',
          isCompacto ? 'size-3' : 'size-3.5',
          isAberto && 'rotate-90',
        )}
      />
    </button>
  )
}
