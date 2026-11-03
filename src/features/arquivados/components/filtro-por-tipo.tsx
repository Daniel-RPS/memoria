import { cn } from 'cn'
import { ROTULOS_DO_FILTRO, TIPOS_ARQUIVADOS, type FiltroDeTipo } from '@/lib/arquivados'

const OPCOES: FiltroDeTipo[] = ['todos', ...TIPOS_ARQUIVADOS]

interface FiltroPorTipoProps {
  valor: FiltroDeTipo
  contagem: Record<FiltroDeTipo, number>
  onMudar: (valor: FiltroDeTipo) => void
}

/** Botões compactos (um só ativo) com a contagem de cada tipo: Todos 12 · Tarefas 4… */
export function FiltroPorTipo({ valor, contagem, onMudar }: FiltroPorTipoProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Filtrar por tipo"
      className="flex max-w-full flex-wrap rounded-md border border-pauta bg-papel p-0.5"
    >
      {OPCOES.map((opcao) => (
        <button
          key={opcao}
          type="button"
          role="radio"
          aria-checked={valor === opcao}
          onClick={() => onMudar(opcao)}
          className={cn(
            'flex h-7 items-center gap-1.5 rounded-[5px] px-2.5 text-sm whitespace-nowrap text-grafite transition-colors hover:text-tinta focus-visible:outline-2 focus-visible:outline-caneta motion-reduce:transition-none',
            valor === opcao && 'bg-caneta text-primary-foreground hover:text-primary-foreground',
          )}
        >
          {ROTULOS_DO_FILTRO[opcao]}
          <span className="text-xs tabular-nums opacity-75">{contagem[opcao]}</span>
        </button>
      ))}
    </div>
  )
}
