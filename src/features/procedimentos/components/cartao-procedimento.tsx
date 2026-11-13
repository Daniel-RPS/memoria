import { useEffect, useRef, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react'
import { useDndContext } from '@dnd-kit/core'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ChevronDown, ChevronUp, Star } from 'lucide-react'
import { Link } from 'react-router'
import { cn } from 'cn'
import { IconeDaEntidade } from '@/components/icones/icone-da-entidade'
import { MenuDoCartao } from '@/components/menu-do-cartao'
import { IndicadorNotas } from '@/components/notas/indicador-notas'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { Procedure } from '@/db/types'
import { alternarFavoritoProcedimento, moverProcedimento } from '@/db/repositories/procedure-repository'
import type { DirecaoDeMover } from '@/domain/procedimentos'
import { useQuantasNotas } from '@/hooks/contexto-painel-notas'
import { useAcoesDeArquivo } from '@/hooks/use-acoes-de-arquivo'
import { vinculoDoProcedimento } from '@/lib/notas'
import { previaDoProcedimento } from '@/lib/procedimentos'
import { useAnimarTrocaDeLugar } from '@/features/procedimentos/hooks/use-animar-troca-de-lugar'

/** Setas de ordem do cartão; ausente = sem reordenar (busca ou filtro ativo). */
export interface OrdemDoCartao {
  /** Posição no bloco (anima a troca de lugar). */
  posicao: number
  canSubir: boolean
  canDescer: boolean
}

interface CartaoProcedimentoProps {
  procedimento: Procedure
  /** Cor da faixa (já ajustada para o tema); sem categoria = neutra. */
  cor: string
  ordem?: OrdemDoCartao
}

type AlvoDoFoco = 'link' | DirecaoDeMover

/**
 * Cartão da lista: faixa na cor da categoria, título, 3 primeiras etapas e contagem. Com `ordem`,
 * arrasta com o mouse (dentro da `GradeProcedimentos`), tem setas de subir/descer (no hover e
 * no foco) e Alt+↑ / Alt+↓ com o cartão focado.
 */
export function CartaoProcedimento({ procedimento, cor, ordem }: CartaoProcedimentoProps) {
  const previa = previaDoProcedimento(procedimento)
  const { arquivarComAviso } = useAcoesDeArquivo()
  const vinculo = vinculoDoProcedimento(procedimento)
  const hasNotas = useQuantasNotas(vinculo) > 0
  const raizRef = useRef<HTMLDivElement>(null)
  const linkRef = useRef<HTMLAnchorElement>(null)
  const botaoRef = useRef<Record<DirecaoDeMover, HTMLButtonElement | null>>({
    cima: null,
    baixo: null,
  })
  /** Quem recebe o foco de volta depois de trocar de lugar (o DOM é reordenado). */
  const focoAposMoverRef = useRef<AlvoDoFoco | null>(null)
  const posicao = ordem?.posicao ?? -1
  const { active: arrastado } = useDndContext()
  const { setNodeRef, listeners, transform, transition, isDragging } = useSortable({
    id: procedimento.id,
    disabled: !ordem,
  })

  useAnimarTrocaDeLugar(raizRef, posicao, arrastado !== null)

  useEffect(() => {
    const alvo = focoAposMoverRef.current
    if (!alvo) return
    focoAposMoverRef.current = null
    const botao = alvo === 'link' ? null : botaoRef.current[alvo]
    if (botao && !botao.disabled) botao.focus()
    else linkRef.current?.focus()
  }, [posicao])

  function mover(direcao: DirecaoDeMover, foco: AlvoDoFoco) {
    if (!ordem || !(direcao === 'cima' ? ordem.canSubir : ordem.canDescer)) return
    focoAposMoverRef.current = foco
    void moverProcedimento(procedimento.id, direcao)
  }

  function handleKeyDown(evento: KeyboardEvent<HTMLAnchorElement>) {
    if (!ordem || !evento.altKey || evento.ctrlKey || evento.metaKey || evento.shiftKey) return
    if (evento.key !== 'ArrowUp' && evento.key !== 'ArrowDown') return
    evento.preventDefault()
    mover(evento.key === 'ArrowUp' ? 'cima' : 'baixo', 'link')
  }

  /** Botões (setas, menu ⋯, notas) não começam o arrasto. */
  function handlePointerDown(evento: PointerEvent<HTMLDivElement>) {
    const alvo = evento.target
    if (alvo instanceof Element && alvo.closest('button, [data-sem-arrasto]')) return
    listeners?.onPointerDown?.(evento)
  }

  return (
    <div
      ref={(elemento) => {
        raizRef.current = elemento
        setNodeRef(elemento)
      }}
      onPointerDown={ordem ? handlePointerDown : undefined}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        'group/cartao-menu relative h-full',
        isDragging && 'z-20 cursor-grabbing [&>a]:shadow-lg [&>a]:border-caneta/45',
      )}
    >
      <Link
        ref={linkRef}
        draggable={false}
        to={`/procedimentos/${procedimento.id}`}
        onKeyDown={handleKeyDown}
        aria-keyshortcuts={ordem ? 'Alt+ArrowUp Alt+ArrowDown' : undefined}
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
        {/* Uma linha só: as datas encolhem antes de quebrar (o cartão não cresce). Com nota, o
            fim da linha fica livre para o indicador, que fica fora do link. */}
        <span
          className={cn(
            'mt-auto flex items-baseline justify-between gap-2 pt-3 text-xs whitespace-nowrap text-grafite tabular-nums',
            hasNotas && 'pr-8',
          )}
        >
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
      <div className="absolute top-1.5 right-8 z-10">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={procedimento.favorito ? `Remover dos favoritos: ${procedimento.titulo}` : `Favoritar: ${procedimento.titulo}`}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                void alternarFavoritoProcedimento(procedimento.id)
              }}
              className={cn(
                'text-grafite transition-colors hover:text-amber-500 focus-visible:opacity-100 focus-visible:text-amber-500 motion-reduce:transition-none',
                procedimento.favorito
                  ? 'opacity-100 text-amber-500 hover:text-amber-600'
                  : 'opacity-0 group-focus-within/cartao-menu:opacity-100 group-hover/cartao-menu:opacity-100',
              )}
            >
              <Star
                className={cn(
                  'size-3.5',
                  procedimento.favorito ? 'fill-amber-500 text-amber-500' : 'text-grafite',
                )}
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            {procedimento.favorito ? 'Remover dos favoritos' : 'Favoritar'}
          </TooltipContent>
        </Tooltip>
      </div>
      {ordem && (
        <div className="absolute top-9 right-1.5 z-10 flex flex-col">
          <SetaDeOrdem
            direcao="cima"
            nome={procedimento.titulo}
            isDesabilitada={!ordem.canSubir}
            botaoRef={(botao) => {
              botaoRef.current.cima = botao
            }}
            onMover={() => mover('cima', 'cima')}
          />
          <SetaDeOrdem
            direcao="baixo"
            nome={procedimento.titulo}
            isDesabilitada={!ordem.canDescer}
            botaoRef={(botao) => {
              botaoRef.current.baixo = botao
            }}
            onMover={() => mover('baixo', 'baixo')}
          />
        </div>
      )}
      <IndicadorNotas
        vinculo={vinculo}
        titulo={procedimento.titulo}
        className="absolute right-2.5 bottom-2.5 z-10"
      />
    </div>
  )
}

interface SetaDeOrdemProps {
  direcao: DirecaoDeMover
  nome: string
  isDesabilitada: boolean
  botaoRef: (botao: HTMLButtonElement | null) => void
  onMover: () => void
}

/** Seta pequena de subir/descer, visível no hover e no foco do cartão. */
function SetaDeOrdem({ direcao, nome, isDesabilitada, botaoRef, onMover }: SetaDeOrdemProps) {
  const dica = direcao === 'cima' ? 'Mover para cima' : 'Mover para baixo'
  const Icone = direcao === 'cima' ? ChevronUp : ChevronDown
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {/* O span recebe o hover da dica mesmo com o botão desabilitado. */}
        <span className="flex">
          <Button
            ref={botaoRef}
            type="button"
            variant="ghost"
            size="icon-xs"
            disabled={isDesabilitada}
            aria-label={`${dica}: ${nome}`}
            onClick={onMover}
            className="bg-card/80 text-grafite opacity-0 group-focus-within/cartao-menu:opacity-100 group-hover/cartao-menu:opacity-100 focus-visible:opacity-100 disabled:opacity-0 group-hover/cartao-menu:disabled:opacity-35 group-focus-within/cartao-menu:disabled:opacity-35 motion-reduce:transition-none"
          >
            <Icone />
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent side="left">{dica}</TooltipContent>
    </Tooltip>
  )
}
