import { forwardRef, useState, type ComponentPropsWithoutRef } from 'react'
import { Bell } from 'lucide-react'
import { cn } from 'cn'
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover'
import type { AlvoDeHorario } from '@/db/repositories/horario-repository'
import type { DataLocal } from '@/db/types'
import { rotuloCurtoDaAntecedencia } from '@/domain/lembretes'
import { useAvisosDoAlvo } from '@/hooks/use-avisos-do-alvo'
import { OpcoesDeAviso } from '@/components/lembretes/opcoes-de-aviso'

interface ChipAvisosProps extends ComponentPropsWithoutRef<'button'> {
  /** Rótulos dos avisos, para o leitor de tela e a dica. */
  rotulos: string[]
  /** Semana: menor e no fluxo do texto, sem empurrar o título. */
  isCompacto?: boolean
}

/** Chip só com o sino, na linha da tarefa que tem aviso; clicar abre o popup. */
export const ChipAvisos = forwardRef<HTMLButtonElement, ChipAvisosProps>(function ChipAvisos(
  { rotulos, isCompacto = false, className, ...props },
  ref,
) {
  const descricao = rotulos.join(', ')
  return (
    <button
      ref={ref}
      type="button"
      data-sem-arrasto=""
      data-chip-avisos=""
      aria-label={`Avisos: ${descricao}. Alterar avisos`}
      title={descricao}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-[3px] text-caneta hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-caneta',
        isCompacto ? 'h-4 w-4 align-[-0.125rem]' : 'size-5',
        className,
      )}
      {...props}
    >
      <Bell aria-hidden className={isCompacto ? 'size-2.5' : 'size-3'} />
    </button>
  )
})

interface AvisosDaTarefaProps {
  alvo: AlvoDeHorario
  /** Dia do evento (da tarefa ou do card do item). */
  data: DataLocal
  horario?: string
  titulo: string
  /** Popup aberto (pelo menu ⋯ ou pelo chip). */
  isAberto: boolean
  onMudarAberto: (isAberto: boolean) => void
  isCompacto?: boolean
  className?: string
}

/**
 * O chip do sino na linha da tarefa/item e o popup de avisos ancorado nele. Sem aviso e
 * fechado, não mostra nada.
 */
export function AvisosDaTarefa({
  alvo,
  data,
  horario,
  titulo,
  isAberto,
  onMudarAberto,
  isCompacto = false,
  className,
}: AvisosDaTarefaProps) {
  const { antecedencias } = useAvisosDoAlvo(alvo)
  if (antecedencias.length === 0 && !isAberto) return null
  return (
    <Popover open={isAberto} onOpenChange={onMudarAberto}>
      <PopoverAnchor asChild>
        {antecedencias.length > 0 ? (
          <ChipAvisos
            rotulos={antecedencias.map(rotuloCurtoDaAntecedencia)}
            isCompacto={isCompacto}
            className={className}
            aria-expanded={isAberto}
            onClick={() => onMudarAberto(!isAberto)}
          />
        ) : (
          <span aria-hidden className="inline-block h-4 w-0 align-middle" />
        )}
      </PopoverAnchor>
      <PopoverContent align="start" className="w-72 p-3">
        {isAberto && <AvisosDoAlvo alvo={alvo} data={data} horario={horario} titulo={titulo} />}
      </PopoverContent>
    </Popover>
  )
}

interface AvisosDoAlvoProps {
  alvo: AlvoDeHorario
  data: DataLocal
  horario?: string
  titulo: string
}

/** As opções de aviso gravando direto na tarefa/item (cada marcação já vale). */
export function AvisosDoAlvo({ alvo, data, horario, titulo }: AvisosDoAlvoProps) {
  const { antecedencias, mudarAvisos, definirHorario } = useAvisosDoAlvo(alvo)
  // Estado local enquanto o popup está aberto: marcar várias seguidas não perde nenhuma
  // esperando o banco responder.
  const [selecionadas, setSelecionadas] = useState(antecedencias)
  return (
    <OpcoesDeAviso
      data={data}
      horario={horario}
      titulo={titulo}
      selecionadas={selecionadas}
      onMudarSelecionadas={(novas) => {
        setSelecionadas(novas)
        void mudarAvisos(novas)
      }}
      onDefinirHorario={(novo) => void definirHorario(novo)}
    />
  )
}
