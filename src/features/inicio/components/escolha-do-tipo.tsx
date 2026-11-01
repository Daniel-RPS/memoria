import { ListChecks, SquareCheck } from 'lucide-react'
import { cn } from 'cn'
import type { TipoCaptura } from '@/lib/captura'

interface EscolhaDoTipoProps {
  tipo: TipoCaptura
  onEscolher: (tipo: TipoCaptura) => void
}

const OPCOES = [
  { tipo: 'tarefa', rotulo: 'Tarefa', icone: SquareCheck },
  { tipo: 'grupo', rotulo: 'Grupo', icone: ListChecks },
] as const

/** Tarefa solta ou grupo (card com itens). */
export function EscolhaDoTipo({ tipo, onEscolher }: EscolhaDoTipoProps) {
  return (
    <div role="group" aria-label="Tipo" className="flex rounded-md bg-nevoa p-0.5">
      {OPCOES.map(({ tipo: opcao, rotulo, icone: Icone }) => (
        <button
          key={opcao}
          type="button"
          aria-pressed={tipo === opcao}
          onClick={() => onEscolher(opcao)}
          className={cn(
            'flex h-7 items-center gap-1.5 rounded px-2.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
            tipo === opcao ? 'bg-papel font-semibold shadow-sm' : 'text-grafite hover:text-tinta',
          )}
        >
          <Icone aria-hidden className="size-3.5" />
          {rotulo}
        </button>
      ))}
    </div>
  )
}
