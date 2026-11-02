import type { CSSProperties } from 'react'
import { Link } from 'react-router'
import type { Procedure } from '@/db/types'
import { previaDoProcedimento } from '@/lib/procedimentos'

interface CartaoProcedimentoProps {
  procedimento: Procedure
  /** Cor da faixa (já ajustada para o tema); sem categoria = neutra. */
  cor: string
}

/** Cartão da lista: faixa na cor da categoria, título, 3 primeiras etapas e contagem. */
export function CartaoProcedimento({ procedimento, cor }: CartaoProcedimentoProps) {
  const previa = previaDoProcedimento(procedimento)
  return (
    <Link
      to={`/procedimentos/${procedimento.id}`}
      className="group/cartao relative flex h-full flex-col overflow-hidden rounded-md border border-pauta bg-card px-4 pt-3.5 pb-3 transition-colors hover:border-caneta/45 hover:bg-accent/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-caneta motion-reduce:transition-none"
      style={{ '--cor-do-cartao': cor } as CSSProperties}
    >
      <span aria-hidden className="absolute inset-x-0 top-0 h-[3px] bg-(--cor-do-cartao)" />
      <span className="line-clamp-2 font-semibold leading-snug break-words">
        {procedimento.titulo}
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
      <span className="mt-auto flex items-baseline justify-between gap-2 pt-3 text-xs text-grafite tabular-nums">
        <span>{previa.total}</span>
        {previa.editadoEm && <span>{previa.editadoEm}</span>}
      </span>
    </Link>
  )
}
