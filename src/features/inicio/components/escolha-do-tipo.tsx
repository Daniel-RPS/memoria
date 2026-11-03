import { cn } from 'cn'
import type { TipoCaptura } from '@/lib/captura'

interface EscolhaDoTipoProps {
  tipo: TipoCaptura
  onEscolher: (tipo: TipoCaptura) => void
}

const OPCOES = [
  { tipo: 'tarefa', rotulo: 'Tarefa' },
  { tipo: 'grupo', rotulo: 'Grupo' },
] as const

/** Tarefa solta (ou item, com um grupo escolhido no seletor de grupo) ou grupo novo com itens. */
export function EscolhaDoTipo({ tipo, onEscolher }: EscolhaDoTipoProps) {
  return (
    <div role="group" aria-label="Tipo" className="flex rounded-md bg-nevoa p-0.5">
      {OPCOES.map(({ tipo: opcao, rotulo }) => (
        <button
          key={opcao}
          type="button"
          aria-pressed={tipo === opcao}
          onClick={() => onEscolher(opcao)}
          className={cn(
            'flex h-7 items-center rounded px-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
            tipo === opcao ? 'bg-papel font-semibold shadow-sm' : 'text-grafite hover:text-tinta',
          )}
        >
          {rotulo}
        </button>
      ))}
    </div>
  )
}
