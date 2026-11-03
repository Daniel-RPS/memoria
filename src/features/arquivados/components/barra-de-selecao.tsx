import { Trash2, Undo2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface BarraDeSelecaoProps {
  quantidade: number
  total: number
  onDesarquivar: () => void
  onExcluir: () => void
  onSelecionarTodos: () => void
  onLimpar: () => void
}

/** Aparece com itens marcados: desarquivar ou excluir vários de uma vez. */
export function BarraDeSelecao({
  quantidade,
  total,
  onDesarquivar,
  onExcluir,
  onSelecionarTodos,
  onLimpar,
}: BarraDeSelecaoProps) {
  return (
    <div
      role="toolbar"
      aria-label="Ações para os itens selecionados"
      className="flex flex-wrap items-center gap-2 rounded-md border border-pauta bg-accent/50 px-3 py-2 text-sm"
    >
      <span className="mr-1 font-medium tabular-nums">
        {quantidade} {quantidade === 1 ? 'selecionado' : 'selecionados'}
      </span>
      <Button variant="outline" size="sm" onClick={onDesarquivar}>
        <Undo2 /> Desarquivar
      </Button>
      <Button variant="outline" size="sm" className="text-destructive" onClick={onExcluir}>
        <Trash2 /> Excluir…
      </Button>
      <span className="ml-auto flex gap-3 text-xs text-grafite">
        {quantidade < total && (
          <button
            type="button"
            className="underline-offset-2 hover:underline"
            onClick={onSelecionarTodos}
          >
            Selecionar todos ({total})
          </button>
        )}
        <button type="button" className="underline-offset-2 hover:underline" onClick={onLimpar}>
          Limpar seleção
        </button>
      </span>
    </div>
  )
}
