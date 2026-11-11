import { cn } from 'cn'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { textoDasClasses, type BarraPorCategoria } from '@/domain/numeros'
import { COR_EM_ABERTO, COR_NAO_CONCLUIDAS } from '@/features/dados/components/cores-dos-numeros'
import { useCorNaTela } from '@/hooks/use-cor-na-tela'

interface Segmento {
  chave: string
  quantidade: number
  dica: string
  /** Classe de fundo (não concluídas); a parte concluída usa `cor`. */
  classe?: string
  cor?: string
}

function segmentosDa(barra: BarraPorCategoria, cor: string): Segmento[] {
  const segmentos: Segmento[] = [
    {
      chave: 'concluidas',
      quantidade: barra.concluidas,
      dica: `${barra.concluidas} ${barra.concluidas === 1 ? 'concluída' : 'concluídas'}`,
      cor,
    },
    {
      chave: 'nao-concluidas',
      quantidade: barra.naoConcluidas,
      dica: `${barra.naoConcluidas} ${barra.naoConcluidas === 1 ? 'não concluída' : 'não concluídas'}`,
      classe: COR_NAO_CONCLUIDAS.fundo,
    },
    // Sem fundo próprio: o trilho já é o cinza de "em aberto".
    { chave: 'em-aberto', quantidade: barra.emAberto, dica: `${barra.emAberto} em aberto` },
  ]
  return segmentos.filter((segmento) => segmento.quantidade > 0)
}

/**
 * Uma barra por categoria (já ordenadas pelo total), com 100% = total da categoria, em
 * segmentos: concluídas na cor da categoria, não concluídas em âmbar e em aberto no trilho
 * neutro. Passar o mouse num segmento mostra a contagem dele. Sem categoria = cor neutra.
 */
export function GraficoPorCategoria({ barras }: { barras: BarraPorCategoria[] }) {
  const corNaTela = useCorNaTela()

  return (
    <section
      aria-label="Por categoria"
      data-grafico-por-categoria=""
      className="grid content-start gap-2.5"
    >
      <h3 className="text-xs font-semibold tracking-tight text-grafite">Por categoria</h3>
      <ul className="grid gap-3">
        {barras.map((barra) => {
          const cor = barra.cor ? corNaTela(barra.cor) : 'var(--grafite)'
          const resumo = textoDasClasses(barra, false) || `${barra.emAberto} em aberto`
          return (
            <li key={barra.id ?? 'sem-categoria'} className="grid gap-1.5 text-sm">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  aria-hidden
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: cor }}
                />
                <span className="truncate text-tinta">{barra.nome}</span>
                <span className="ml-auto shrink-0 text-xs font-medium whitespace-nowrap text-grafite tabular-nums">
                  {resumo}
                </span>
              </div>
              <div
                role="img"
                aria-label={`${barra.nome}: ${textoDasClasses(barra)}`}
                className={cn('flex h-[7px] overflow-hidden rounded-full', COR_EM_ABERTO.fundo)}
              >
                {segmentosDa(barra, cor).map((segmento) => (
                  <Tooltip key={segmento.chave}>
                    <TooltipTrigger asChild>
                      <div
                        className={cn('h-full', segmento.classe)}
                        style={{
                          width: `${(segmento.quantidade / barra.total) * 100}%`,
                          ...(segmento.cor && { backgroundColor: segmento.cor }),
                        }}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{segmento.dica}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
