import { useId, useState, type CSSProperties } from 'react'
import { cn } from 'cn'
import { ChevronRecolher, ConteudoRecolhivel } from '@/components/secao-recolhivel'
import { fracaoFeita, textoResumoDoGrupo, type GrupoNaLista } from '@/lib/grupos'
import { ConteudoDoGrupo } from '@/features/grupos/components/conteudo-do-grupo'

interface CartaoDoGrupoProps {
  grupo: GrupoNaLista
  /** Cor da faixa e da barra (já ajustada para o tema); sem categoria = neutra. */
  cor: string
  isAberto: boolean
  onAlternar: () => void
}

/**
 * Cartão de um grupo: faixa na cor da categoria, nome, resumo e barra de progresso. O cabeçalho
 * só abre e fecha; aberto, o cartão ocupa a linha inteira e mostra o conteúdo (só leitura).
 */
export function CartaoDoGrupo({ grupo, cor, isAberto, onAlternar }: CartaoDoGrupoProps) {
  const idConteudo = useId()
  // O conteúdo só é montado na primeira abertura e fica montado (para animar ao fechar).
  const [isMontado, setIsMontado] = useState(isAberto)
  if (isAberto && !isMontado) setIsMontado(true)
  const fracao = fracaoFeita(grupo)

  return (
    <li
      data-grupo={grupo.serie.titulo}
      className={cn('min-w-0', isAberto && 'col-span-full')}
      style={{ '--cor-do-cartao': cor } as CSSProperties}
    >
      <article
        aria-label={grupo.serie.titulo}
        className={cn(
          'relative overflow-hidden rounded-md border bg-card transition-colors motion-reduce:transition-none',
          isAberto ? 'border-caneta/35' : 'border-pauta hover:border-caneta/45',
        )}
      >
        <span
          aria-hidden
          data-faixa
          className="absolute inset-x-0 top-0 h-[3px] bg-(--cor-do-cartao)"
        />
        <button
          type="button"
          aria-expanded={isAberto}
          aria-controls={idConteudo}
          onClick={onAlternar}
          className="flex w-full items-start gap-3 px-4 pt-3.5 pb-3 text-left outline-none hover:bg-accent/40 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-caneta"
        >
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="leading-snug font-semibold break-words">{grupo.serie.titulo}</span>
            <span className="text-sm text-grafite">{textoResumoDoGrupo(grupo)}</span>
            {fracao !== undefined && (
              <span
                aria-hidden
                data-progresso={Math.round(fracao * 100)}
                className="mt-1.5 block h-1 overflow-hidden rounded-full bg-pauta"
              >
                <span
                  className="block h-full rounded-full bg-(--cor-do-cartao)"
                  style={{ width: `${fracao * 100}%` }}
                />
              </span>
            )}
          </span>
          <ChevronRecolher isAberta={isAberto} className="mt-1" />
        </button>
        <ConteudoRecolhivel id={idConteudo} isAberta={isAberto}>
          {isMontado && <ConteudoDoGrupo grupo={grupo} />}
        </ConteudoRecolhivel>
      </article>
    </li>
  )
}
