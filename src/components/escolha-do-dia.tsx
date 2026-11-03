import { useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarDays } from 'lucide-react'
import { cn } from 'cn'
import { DialogoEscolherDia } from '@/components/dialogo-escolher-dia'
import type { DataLocal } from '@/db/types'
import { diaEMes } from '@/lib/captura'
import { deDataLocal } from '@/lib/datas'

interface EscolhaDoDiaProps {
  hoje: DataLocal
  data: DataLocal
  onEscolher: (data: DataLocal) => void
}

const CLASSE_OPCAO =
  'flex h-8 items-center gap-1.5 rounded-full px-2.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50'

function classeDaOpcao(isEscolhida: boolean) {
  return cn(
    CLASSE_OPCAO,
    isEscolhida
      ? 'bg-caneta font-semibold text-primary-foreground'
      : 'text-grafite hover:bg-accent hover:text-tinta',
  )
}

function diaPorExtenso(data: DataLocal) {
  return format(deDataLocal(data), "EEEE, d 'de' MMMM", { locale: ptBR })
}

/**
 * Hoje (o padrão) ou outro dia no calendário. Com outro dia escolhido, o botão "Escolher data"
 * mostra a data (ex.: "05/11") marcado como o Hoje; clicar em Hoje volta.
 */
export function EscolhaDoDia({ hoje, data, onEscolher }: EscolhaDoDiaProps) {
  const [isCalendarioAberto, setIsCalendarioAberto] = useState(false)
  const isOutroDia = data !== hoje

  return (
    <div role="group" aria-label="Dia" className="flex flex-wrap gap-0.5">
      <button
        type="button"
        aria-pressed={!isOutroDia}
        title={diaPorExtenso(hoje)}
        onClick={() => onEscolher(hoje)}
        className={classeDaOpcao(!isOutroDia)}
      >
        Hoje
      </button>
      <button
        type="button"
        aria-pressed={isOutroDia}
        title={isOutroDia ? diaPorExtenso(data) : undefined}
        onClick={() => setIsCalendarioAberto(true)}
        className={classeDaOpcao(isOutroDia)}
      >
        {isOutroDia && <CalendarDays aria-hidden className="size-3.5" />}
        {isOutroDia ? diaEMes(data) : 'Escolher data'}
      </button>
      <DialogoEscolherDia
        isAberto={isCalendarioAberto}
        onMudarAberto={setIsCalendarioAberto}
        titulo="Escolher o dia"
        dataInicial={data}
        hoje={hoje}
        onEscolher={onEscolher}
      />
    </div>
  )
}
