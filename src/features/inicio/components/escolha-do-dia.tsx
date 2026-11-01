import { useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarDays } from 'lucide-react'
import { cn } from 'cn'
import { DialogoEscolherDia } from '@/components/dialogo-escolher-dia'
import type { DataLocal } from '@/db/types'
import { atalhosDeDia } from '@/lib/captura'
import { deDataLocal } from '@/lib/datas'

interface EscolhaDoDiaProps {
  hoje: DataLocal
  data: DataLocal
  onEscolher: (data: DataLocal) => void
}

const CLASSE_OPCAO =
  'flex h-8 items-center gap-1.5 rounded-full px-2.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50'

/** Hoje, Amanhã ou outro dia no calendário. O dia escolhido fica marcado. */
export function EscolhaDoDia({ hoje, data, onEscolher }: EscolhaDoDiaProps) {
  const [isCalendarioAberto, setIsCalendarioAberto] = useState(false)
  const atalhos = atalhosDeDia(hoje)
  const isOutroDia = !atalhos.some((atalho) => atalho.data === data)

  return (
    <div role="group" aria-label="Dia" className="flex flex-wrap gap-0.5">
      {atalhos.map((atalho) => {
        const isEscolhido = atalho.data === data
        return (
          <button
            key={atalho.id}
            type="button"
            aria-pressed={isEscolhido}
            title={format(deDataLocal(atalho.data), "EEEE, d 'de' MMMM", { locale: ptBR })}
            onClick={() => onEscolher(atalho.data)}
            className={cn(
              CLASSE_OPCAO,
              isEscolhido
                ? 'bg-caneta font-semibold text-primary-foreground'
                : 'text-grafite hover:bg-accent hover:text-tinta',
            )}
          >
            {atalho.rotulo}
          </button>
        )
      })}
      <button
        type="button"
        aria-pressed={isOutroDia}
        onClick={() => setIsCalendarioAberto(true)}
        className={cn(
          CLASSE_OPCAO,
          isOutroDia
            ? 'bg-caneta font-semibold text-primary-foreground'
            : 'text-grafite hover:bg-accent hover:text-tinta',
        )}
      >
        {isOutroDia && <CalendarDays aria-hidden className="size-3.5" />}
        {isOutroDia
          ? format(deDataLocal(data), "EEE, d 'de' MMM", { locale: ptBR })
          : 'Escolher data…'}
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
