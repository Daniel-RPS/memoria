import { useId, useState, type ReactNode } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router'
import { IndicadorAndamento } from '@/components/indicador-andamento'
import { IndicadorPrioridade } from '@/components/indicador-prioridade'
import { ChevronRecolher, ConteudoRecolhivel } from '@/components/secao-recolhivel'
import { useHoje } from '@/hooks/use-hoje'
import { diaCurto, rotuloDoDia, type GrupoNaLista } from '@/lib/grupos'

/** O que há dentro do grupo, só para ler: pendentes, dias com card e feitos (recolhidos). */
export function ConteudoDoGrupo({ grupo }: { grupo: GrupoNaLista }) {
  const hoje = useHoje()
  const { itensPendentes, diasComCard, itensFeitos } = grupo

  return (
    <div className="flex flex-col gap-4 border-t border-pauta px-4 pt-3 pb-4">
      <div className="flex justify-end">
        <Link
          to={`/dia/${grupo.destino}`}
          className="flex items-center gap-1 rounded-sm text-sm font-medium text-violeta-profundo underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-caneta"
        >
          Abrir no dia
          <span className="text-grafite">({rotuloDoDia(grupo.destino, hoje)})</span>
          <ArrowUpRight aria-hidden className="size-3.5" />
        </Link>
      </div>

      <Parte titulo="Pendentes">
        {itensPendentes.length === 0 ? (
          <p className="text-sm text-grafite">Nada pendente</p>
        ) : (
          <ul className="flex flex-col">
            {itensPendentes.map(({ item, data }) => (
              <li
                key={item.id}
                className="flex items-start gap-2.5 border-b border-pauta/70 py-1.5 text-sm leading-5 last:border-b-0"
              >
                {/* Caixa vazia e apagada: lembra a lista, mas não marca. */}
                <span
                  aria-hidden
                  className="mt-1 size-3 shrink-0 rounded-[3px] border border-grafite/40"
                />
                <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2">
                  <span className="flex min-w-0 items-start gap-1.5">
                    {item.prioridade && <IndicadorPrioridade className="mt-[3px]" />}
                    <span className="break-words">{item.titulo}</span>
                  </span>
                  {item.emAndamento && <IndicadorAndamento isCompacto />}
                </span>
                <span className="shrink-0 text-xs leading-5 text-grafite tabular-nums">
                  {rotuloDoDia(data, hoje)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Parte>

      <Parte titulo="Dias">
        <ul className="flex flex-wrap gap-1.5">
          {diasComCard.map((dia) => (
            <li key={dia.data}>
              <Link
                to={`/dia/${dia.data}`}
                aria-label={`Abrir ${diaCurto(dia.data)}: ${dia.feitos} de ${dia.total} feitos`}
                className="inline-flex items-center rounded-full border border-pauta px-2.5 py-0.5 text-xs text-tinta tabular-nums transition-colors hover:border-caneta/50 hover:bg-accent/50 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-caneta motion-reduce:transition-none"
              >
                {diaCurto(dia.data)}
                <span className="text-grafite">
                  &nbsp;· {dia.feitos}/{dia.total}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Parte>

      {itensFeitos.length > 0 && <Feitos itens={itensFeitos} hoje={hoje} />}
    </div>
  )
}

function Parte({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section aria-label={titulo} className="flex flex-col gap-1.5">
      <h3 className="text-xs font-semibold text-grafite">{titulo}</h3>
      {children}
    </section>
  )
}

interface FeitosProps {
  itens: GrupoNaLista['itensFeitos']
  hoje: string
}

/** "Feitos (n)", recolhido de início: os itens riscados com o dia da conclusão. */
function Feitos({ itens, hoje }: FeitosProps) {
  const [isAberta, setIsAberta] = useState(false)
  const idConteudo = useId()
  return (
    <section aria-label="Feitos" className="flex flex-col">
      <h3>
        <button
          type="button"
          aria-expanded={isAberta}
          aria-controls={idConteudo}
          onClick={() => setIsAberta((atual) => !atual)}
          className="-mx-1 flex items-center gap-1 rounded-sm px-1 text-xs font-semibold text-grafite outline-none hover:text-tinta focus-visible:outline-2 focus-visible:outline-caneta"
        >
          <ChevronRecolher isAberta={isAberta} className="size-3.5" />
          Feitos ({itens.length})
        </button>
      </h3>
      <ConteudoRecolhivel id={idConteudo} isAberta={isAberta}>
        <ul className="flex flex-col pt-1.5">
          {itens.map(({ item, data }) => (
            <li
              key={item.id}
              className="flex items-start gap-2.5 border-b border-pauta/70 py-1.5 text-sm leading-5 text-grafite last:border-b-0"
            >
              <span className="min-w-0 flex-1 break-words line-through">{item.titulo}</span>
              <span className="shrink-0 text-xs leading-5 tabular-nums">
                {rotuloDoDia(data, hoje)}
              </span>
            </li>
          ))}
        </ul>
      </ConteudoRecolhivel>
    </section>
  )
}
