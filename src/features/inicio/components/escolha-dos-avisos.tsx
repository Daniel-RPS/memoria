import { useState } from 'react'
import { Bell } from 'lucide-react'
import { cn } from 'cn'
import { OpcoesDeAviso } from '@/components/lembretes/opcoes-de-aviso'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { DataLocal } from '@/db/types'
import { rotuloCurtoDaAntecedencia } from '@/domain/lembretes'

interface EscolhaDosAvisosProps {
  /** Dia escolhido na barra. */
  data: DataLocal
  /** Horário escolhido na barra (o campo do popup preenche o mesmo). */
  horario?: string
  avisos: number[]
  onMudarAvisos: (avisos: number[]) => void
  onDefinirHorario: (horario: string) => void
}

/**
 * Sino da captura rápida, logo depois do "Horário": abre as mesmas opções de aviso dos menus.
 * Com avisos escolhidos, mostra o sino destacado e "10 min antes" (ou "2 avisos").
 */
export function EscolhaDosAvisos({
  data,
  horario,
  avisos,
  onMudarAvisos,
  onDefinirHorario,
}: EscolhaDosAvisosProps) {
  const [isAberto, setIsAberto] = useState(false)
  const resumo =
    avisos.length === 0
      ? undefined
      : avisos.length === 1
        ? rotuloCurtoDaAntecedencia(avisos[0])
        : `${avisos.length} avisos`

  return (
    <Popover open={isAberto} onOpenChange={setIsAberto}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={resumo ? `Avisos: ${resumo}. Alterar avisos` : 'Notificar'}
          title={resumo ? undefined : 'Notificar'}
          className={cn(
            'flex h-8 items-center gap-1.5 rounded-full px-2.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
            resumo
              ? 'bg-accent font-semibold text-caneta hover:text-tinta'
              : 'text-grafite hover:bg-accent hover:text-tinta',
          )}
        >
          <Bell aria-hidden className={cn('size-3.5', resumo && 'fill-caneta/20')} />
          {resumo}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-3">
        {isAberto && (
          <OpcoesDeAviso
            data={data}
            horario={horario}
            selecionadas={avisos}
            onMudarSelecionadas={onMudarAvisos}
            onDefinirHorario={onDefinirHorario}
          />
        )}
      </PopoverContent>
    </Popover>
  )
}
