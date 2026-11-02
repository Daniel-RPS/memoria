import { IconeDaEntidade } from '@/components/icones/icone-da-entidade'
import { AcoesDasSecoes, SecaoRecolhivel } from '@/components/secao-recolhivel'
import type { BlocoDeProcedimentos } from '@/lib/procedimentos'
import { useCorDeTraco, useCorNaTela } from '@/hooks/use-cor-na-tela'
import { useSecoesRecolhidas } from '@/hooks/use-secoes-recolhidas'
import { CartaoProcedimento } from '@/features/procedimentos/components/cartao-procedimento'

interface ListaProcedimentosProps {
  blocos: BlocoDeProcedimentos[]
  /** Busca ou filtro ativo: os blocos abrem sozinhos, sem mudar o estado salvo. */
  isFiltrando: boolean
}

const idDoBloco = ({ categoria }: BlocoDeProcedimentos) => categoria?.id ?? 'sem-categoria'

/** Um bloco recolhível por categoria (com a cor dela), "Sem categoria" no fim; cartões em grade. */
export function ListaProcedimentos({ blocos, isFiltrando }: ListaProcedimentosProps) {
  const corNaTela = useCorNaTela()
  const corDeTraco = useCorDeTraco()
  const secoes = useSecoesRecolhidas('procedimentos', isFiltrando)
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
        const { categoria, procedimentos } = bloco
        const id = idDoBloco(bloco)
        const corDaFaixa = categoria ? corDeTraco(categoria.cor) : 'var(--grafite)'
        return (
          <SecaoRecolhivel
            key={id}
            titulo={categoria?.nome ?? 'Sem categoria'}
            cor={categoria ? corNaTela(categoria.cor) : null}
            icone={categoria?.icone && <IconeDaEntidade icone={categoria.icone} tamanho="lg" />}
            contagem={procedimentos.length}
            isAberta={secoes.isAberta(id)}
            onAlternar={() => secoes.handleAlternar(id)}
          >
            {/* Colunas pela largura (3 / 2 / 1), sem número fixo. */}
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(13rem,1fr))] gap-3">
              {procedimentos.map((procedimento) => (
                <li key={procedimento.id} className="min-w-0">
                  <CartaoProcedimento procedimento={procedimento} cor={corDaFaixa} />
                </li>
              ))}
            </ul>
          </SecaoRecolhivel>
        )
      })}
    </div>
  )
}
