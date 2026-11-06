import { Link } from 'react-router'
import { cn } from 'cn'
import { IconeDaEntidade } from '@/components/icones/icone-da-entidade'
import { AcoesDasSecoes, SecaoRecolhivel } from '@/components/secao-recolhivel'
import { useCorNaTela } from '@/hooks/use-cor-na-tela'
import { useSecoesRecolhidas } from '@/hooks/use-secoes-recolhidas'
import { textoResumoDoGrupo, type BlocoDeGrupos, type GrupoNaLista } from '@/lib/grupos'

interface ListaDeGruposProps {
  blocos: BlocoDeGrupos[]
  /** Busca ativa: os blocos abrem sozinhos, sem mudar o estado salvo. */
  isFiltrando: boolean
}

const idDoBloco = ({ categoria }: BlocoDeGrupos) => categoria?.id ?? 'sem-categoria'

/** Um bloco recolhível por categoria, com os grupos em linhas simples. */
export function ListaDeGrupos({ blocos, isFiltrando }: ListaDeGruposProps) {
  const corNaTela = useCorNaTela()
  const secoes = useSecoesRecolhidas('grupos', isFiltrando)
  const ids = blocos.map(idDoBloco)

  if (blocos.length === 0) return null
  return (
    <div className="flex flex-col gap-6">
      <AcoesDasSecoes
        isTudoAberto={ids.every(secoes.isAberta)}
        isTudoRecolhido={!ids.some(secoes.isAberta)}
        onExpandirTudo={() => secoes.handleExpandirTudo(ids)}
        onRecolherTudo={() => secoes.handleRecolherTudo(ids)}
      />
      {blocos.map((bloco) => {
        const { categoria, grupos } = bloco
        const id = idDoBloco(bloco)
        const cor = categoria ? corNaTela(categoria.cor) : null
        return (
          <SecaoRecolhivel
            key={id}
            titulo={categoria?.nome ?? 'Sem categoria'}
            cor={cor}
            icone={categoria?.icone && <IconeDaEntidade icone={categoria.icone} tamanho="lg" />}
            contagem={grupos.length}
            isAberta={secoes.isAberta(id)}
            onAlternar={() => secoes.handleAlternar(id)}
          >
            <ul className="divide-y divide-pauta">
              {grupos.map((grupo) => (
                <LinhaDoGrupo key={grupo.serie.id} grupo={grupo} cor={cor} />
              ))}
            </ul>
          </SecaoRecolhivel>
        )
      })}
    </div>
  )
}

interface LinhaDoGrupoProps {
  grupo: GrupoNaLista
  /** Cor da categoria já ajustada ao tema; `null` = sem categoria. */
  cor: string | null
}

/** Bolinha na cor da categoria, nome e o resumo apagado; a linha abre o dia do grupo. */
function LinhaDoGrupo({ grupo, cor }: LinhaDoGrupoProps) {
  return (
    <li>
      <Link
        to={`/dia/${grupo.destino}`}
        className="flex items-baseline gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-accent/40 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-caneta motion-reduce:transition-none"
      >
        <span
          aria-hidden
          data-cor={cor ?? undefined}
          className={cn(
            'size-2.5 shrink-0 translate-y-[-0.05em] rounded-full',
            !cor && 'border border-grafite/50',
          )}
          style={cor ? { backgroundColor: cor } : undefined}
        />
        <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-3 gap-y-0.5">
          <span className="font-medium break-words">{grupo.serie.titulo}</span>
          <span className="text-sm text-grafite">{textoResumoDoGrupo(grupo)}</span>
        </span>
      </Link>
    </li>
  )
}
