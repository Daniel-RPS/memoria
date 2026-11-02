import { IconeDaEntidade } from '@/components/icones/icone-da-entidade'
import { AcoesDasSecoes, SecaoRecolhivel } from '@/components/secao-recolhivel'
import type { TipoAnexo } from '@/db/types'
import { useCorDeTraco, useCorNaTela } from '@/hooks/use-cor-na-tela'
import { useSecoesRecolhidas } from '@/hooks/use-secoes-recolhidas'
import type { BlocoDeNotas } from '@/lib/notas'
import { CartaoNota } from '@/features/notas/components/cartao-nota'

interface ListaDeNotasProps {
  blocos: BlocoDeNotas[]
  anexosPorNota: Map<string, Set<TipoAnexo>>
  /** Onde fica lembrado o que está recolhido (um por modo: `notas:categoria`…). */
  escopo: string
  /** Busca ou filtro ativo: os blocos abrem sozinhos, sem mudar o estado salvo. */
  isFiltrando: boolean
}

/** Blocos recolhíveis (categoria, grupo ou dia), cada um com os cartões em grade. */
export function ListaDeNotas({ blocos, anexosPorNota, escopo, isFiltrando }: ListaDeNotasProps) {
  const corNaTela = useCorNaTela()
  const corDeTraco = useCorDeTraco()
  const secoes = useSecoesRecolhidas(escopo, isFiltrando)
  const ids = blocos.map((bloco) => bloco.id)
  // Por dia (Recentes) não há cor de bloco: sem bolinha.
  const isComBolinha = !escopo.endsWith(':recentes')

  if (blocos.length === 0) return null
  return (
    <div className="flex flex-col gap-6">
      <AcoesDasSecoes
        isTudoAberto={ids.every(secoes.isAberta)}
        isTudoRecolhido={!ids.some(secoes.isAberta)}
        onExpandirTudo={() => secoes.handleExpandirTudo(ids)}
        onRecolherTudo={() => secoes.handleRecolherTudo(ids)}
      />
      {blocos.map((bloco) => (
        <SecaoRecolhivel
          key={bloco.id}
          titulo={bloco.titulo}
          cor={isComBolinha ? (bloco.cor ? corNaTela(bloco.cor) : null) : undefined}
          icone={bloco.icone && <IconeDaEntidade icone={bloco.icone} tamanho="lg" />}
          contagem={bloco.notas.length}
          isAberta={secoes.isAberta(bloco.id)}
          onAlternar={() => secoes.handleAlternar(bloco.id)}
        >
          {/* Colunas pela largura, sem número fixo (como os cartões de Procedimentos). */}
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-3">
            {bloco.notas.map((item) => (
              <li key={item.nota.id} className="min-w-0">
                <CartaoNota
                  item={item}
                  cor={item.dono.cor ? corDeTraco(item.dono.cor) : 'var(--grafite)'}
                  tiposDeAnexo={anexosPorNota.get(item.nota.id)}
                />
              </li>
            ))}
          </ul>
        </SecaoRecolhivel>
      ))}
    </div>
  )
}
