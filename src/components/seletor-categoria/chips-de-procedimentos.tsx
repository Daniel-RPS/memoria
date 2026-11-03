import { IconeDaEntidade } from '@/components/icones/icone-da-entidade'
import { useCategorias } from '@/hooks/use-categorias'
import { useCorNaTela } from '@/hooks/use-cor-na-tela'
import { sugestoesDeProcedimentos } from '@/lib/categorias'

interface ChipsDeProcedimentosProps {
  /** Nome digitado no formulário: filtra os chips. */
  termo: string
  onUsar: (idCategoria: string) => void
  isDesabilitado?: boolean
}

/**
 * "Usar de Procedimentos": as categorias de Procedimentos como chips, para criar a de Grupo
 * com o mesmo nome, cor e ícone. Some quando não há nenhuma (ou nenhuma casa com o termo).
 */
export function ChipsDeProcedimentos({ termo, onUsar, isDesabilitado }: ChipsDeProcedimentosProps) {
  const { categorias } = useCategorias()
  const corNaTela = useCorNaTela()
  const sugestoes = sugestoesDeProcedimentos(categorias, termo)
  if (sugestoes.length === 0) return null

  return (
    <section aria-label="Usar de Procedimentos" className="flex flex-col gap-1.5">
      <h3 className="text-xs font-semibold text-grafite">Usar de Procedimentos</h3>
      <ul className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto p-0.5">
        {sugestoes.map(({ categoria, isExistente }) => (
          <li key={categoria.id}>
            <button
              type="button"
              disabled={isExistente || isDesabilitado}
              title={categoria.nome}
              aria-label={
                isExistente
                  ? `${categoria.nome} (já existe em Grupos)`
                  : `Criar ${categoria.nome} igual à de Procedimentos`
              }
              onClick={() => onUsar(categoria.id)}
              className="flex h-7 max-w-full items-center gap-1.5 rounded-full border border-pauta bg-papel pr-2.5 pl-2 text-sm outline-none hover:border-caneta hover:bg-accent focus-visible:ring-2 focus-visible:ring-caneta disabled:pointer-events-none disabled:text-grafite"
            >
              <span
                aria-hidden
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: corNaTela(categoria.cor) }}
              />
              <IconeDaEntidade icone={categoria.icone} tamanho="sm" />
              <span className="min-w-0 truncate">{categoria.nome}</span>
              {isExistente && <span className="shrink-0 text-xs">· já existe</span>}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
