import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover'
import type { AlvoDeHorario } from '@/db/repositories/horario-repository'
import { useHorario } from '@/hooks/use-horario'
import { CampoDeHorario } from '@/components/horario/campo-de-horario'
import { ChipHorario } from '@/components/horario/chip-horario'

interface HorarioDaTarefaProps {
  alvo: AlvoDeHorario
  /** `HH:mm`; ausente = sem chip. */
  horario?: string
  titulo: string
  /** Popover aberto (pelo menu ⋯ ou pelo chip). */
  isAberto: boolean
  onMudarAberto: (isAberto: boolean) => void
  /** Semana: chip menor. */
  isCompacto?: boolean
  className?: string
}

/**
 * O chip do horário na linha da tarefa/item e o popover pequeno ancorado nele para definir,
 * alterar ou remover. Sem horário e fechado, não mostra nada.
 */
export function HorarioDaTarefa({
  alvo,
  horario,
  titulo,
  isAberto,
  onMudarAberto,
  isCompacto = false,
  className,
}: HorarioDaTarefaProps) {
  if (!horario && !isAberto) return null
  return (
    <Popover open={isAberto} onOpenChange={onMudarAberto}>
      <PopoverAnchor asChild>
        {horario ? (
          <ChipHorario
            horario={horario}
            isCompacto={isCompacto}
            className={className}
            aria-expanded={isAberto}
            onClick={() => onMudarAberto(!isAberto)}
          />
        ) : (
          <span aria-hidden className="inline-block h-4 w-0 align-middle" />
        )}
      </PopoverAnchor>
      <PopoverContent align="start" className="w-56 p-3">
        {isAberto && (
          <FormularioHorario
            alvo={alvo}
            horario={horario}
            titulo={titulo}
            onFechar={() => onMudarAberto(false)}
          />
        )}
      </PopoverContent>
    </Popover>
  )
}

interface FormularioHorarioProps {
  alvo: AlvoDeHorario
  horario?: string
  titulo: string
  onFechar: () => void
}

function FormularioHorario({ alvo, horario, titulo, onFechar }: FormularioHorarioProps) {
  const { salvarHorario, removerHorario } = useHorario()
  return (
    <CampoDeHorario
      horario={horario}
      rotulo={`Horário de ${titulo}`}
      onSalvar={(novo) => {
        onFechar()
        if (novo !== horario) void salvarHorario(alvo, novo)
      }}
      onRemover={() => {
        onFechar()
        void removerHorario(alvo)
      }}
    />
  )
}
