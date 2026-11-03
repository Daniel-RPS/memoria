import type { CSSProperties } from 'react'
import { Link } from 'react-router'
import { IconeDaEntidade } from '@/components/icones/icone-da-entidade'
import { MenuDoCartao } from '@/components/menu-do-cartao'
import type { Procedure } from '@/db/types'
import { useAcoesDeArquivo } from '@/hooks/use-acoes-de-arquivo'
import { previaDoProcedimento } from '@/lib/procedimentos'

interface CartaoProcedimentoProps {
  procedimento: Procedure
  /** Cor da faixa (já ajustada para o tema); sem categoria = neutra. */
  cor: string
}

/** Cartão da lista: faixa na cor da categoria, título, 3 primeiras etapas e contagem. */
export function CartaoProcedimento({ procedimento, cor }: CartaoProcedimentoProps) {
  const previa = previaDoProcedimento(procedimento)
  const { arquivarComAviso } = useAcoesDeArquivo()
  return (
    <div className="group/cartao-menu relative h-full">
      <Link
        to={`/procedimentos/${procedimento.id}`}
        className="group/cartao relative flex h-full flex-col overflow-hidden rounded-md border border-pauta bg-card px-4 pt-3.5 pb-3 transition-colors hover:border-caneta/45 hover:bg-accent/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-caneta motion-reduce:transition-none"
        style={{ '--cor-do-cartao': cor } as CSSProperties}
      >
        <span aria-hidden className="absolute inset-x-0 top-0 h-[3px] bg-(--cor-do-cartao)" />
        <span className="flex items-start gap-1.5">
          <IconeDaEntidade icone={procedimento.icone} className="mt-[0.2rem]" />
          <span className="line-clamp-2 min-w-0 pr-6 font-semibold leading-snug break-words">
            {procedimento.titulo}
          </span>
        </span>
        {previa.isVazio ? (
          <span className="mt-2 text-sm text-grafite">Nenhuma etapa ainda</span>
        ) : (
          <span className="mt-2 flex min-w-0 flex-col text-sm leading-6 text-grafite">
            {previa.etapas.map((etapa) => (
              <span key={etapa} className="truncate">
                {etapa}
              </span>
            ))}
            {previa.restantes && <span>{previa.restantes}</span>}
          </span>
        )}
        {/* Uma linha só: as datas encolhem antes de quebrar (o cartão não cresce). */}
        <span className="mt-auto flex items-baseline justify-between gap-2 pt-3 text-xs whitespace-nowrap text-grafite tabular-nums">
          <span className="shrink-0">{previa.total}</span>
          <span className="min-w-0 truncate" title={previa.datas}>
            {previa.datas}
          </span>
        </span>
      </Link>
      <MenuDoCartao
        nome={procedimento.titulo}
        onArquivar={() =>
          void arquivarComAviso({ procedimentos: [procedimento.id] }, ['procedimento'])
        }
      />
    </div>
  )
}
