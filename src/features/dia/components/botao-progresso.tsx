import { ChevronRight } from 'lucide-react'
import { cn } from 'cn'
import { textoProgresso, type Progresso } from '@/lib/tarefas'

interface BotaoProgressoProps {
  progresso: Progresso
  tituloTarefa: string
  isAberto: boolean
  idPainel: string
  onAlternar: () => void
}

/** "2 de 5" ao lado do título; abre e fecha as subtarefas. */
export function BotaoProgresso({
  progresso,
  tituloTarefa,
  isAberto,
  idPainel,
  onAlternar,
}: BotaoProgressoProps) {
  const isCompleto = progresso.concluidas === progresso.total

  return (
    <button
      type="button"
      onClick={onAlternar}
      aria-expanded={isAberto}
      aria-controls={idPainel}
      aria-label={`Subtarefas de ${tituloTarefa}: ${progresso.concluidas} de ${progresso.total} concluídas`}
      className={cn(
        'flex items-center gap-0.5 rounded-sm text-sm whitespace-nowrap tabular-nums hover:text-tinta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-caneta',
        isCompleto ? 'text-caneta' : 'text-grafite',
      )}
    >
      {textoProgresso(progresso)}
      <ChevronRight
        aria-hidden
        className={cn(
          'size-3.5 transition-transform motion-reduce:transition-none',
          isAberto && 'rotate-90',
        )}
      />
    </button>
  )
}
