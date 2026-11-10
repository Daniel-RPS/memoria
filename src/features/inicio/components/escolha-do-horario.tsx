import { useState } from 'react'
import { Clock, X } from 'lucide-react'
import { cn } from 'cn'
import { CampoDeHorario } from '@/components/horario/campo-de-horario'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface EscolhaDoHorarioProps {
  /** `HH:mm`; ausente = sem horário (o padrão). */
  horario?: string
  onEscolher: (horario: string | undefined) => void
}

const CLASSE_OPCAO =
  'flex h-8 items-center gap-1.5 rounded-full px-2.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50'

/**
 * Horário opcional na captura rápida: "Horário" discreto ao lado do dia; escolhido, vira o chip
 * "🕘 12:00" (clicar altera) com um × para tirar.
 */
export function EscolhaDoHorario({ horario, onEscolher }: EscolhaDoHorarioProps) {
  const [isAberto, setIsAberto] = useState(false)

  return (
    <div className="flex items-center">
      <Popover open={isAberto} onOpenChange={setIsAberto}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={horario ? `Horário ${horario}. Alterar horário` : 'Definir horário'}
            className={cn(
              CLASSE_OPCAO,
              horario
                ? 'bg-accent pr-1.5 font-semibold text-caneta tabular-nums hover:text-tinta'
                : 'text-grafite hover:bg-accent hover:text-tinta',
            )}
          >
            <Clock aria-hidden className="size-3.5" />
            {horario ?? 'Horário'}
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-56 p-3">
          {isAberto && (
            <CampoDeHorario
              horario={horario}
              rotulo="Horário da tarefa"
              onSalvar={(novo) => {
                setIsAberto(false)
                onEscolher(novo)
              }}
              onRemover={() => {
                setIsAberto(false)
                onEscolher(undefined)
              }}
            />
          )}
        </PopoverContent>
      </Popover>
      {horario && (
        <button
          type="button"
          aria-label="Tirar horário"
          title="Tirar horário"
          onClick={() => onEscolher(undefined)}
          className="-ml-1 flex size-6 items-center justify-center rounded-full text-grafite outline-none hover:bg-accent hover:text-tinta focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <X aria-hidden className="size-3.5" />
        </button>
      )}
    </div>
  )
}
