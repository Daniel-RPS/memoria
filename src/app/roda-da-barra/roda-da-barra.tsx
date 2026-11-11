import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type RefObject,
} from 'react'
import { createPortal } from 'react-dom'
import type { LucideIcon } from 'lucide-react'
import { useNavigate } from 'react-router'
import { cn } from 'cn'
import {
  ALTURA_DA_ETIQUETA,
  ALTURA_DA_RODA,
  RAIO_DO_FURO,
  anguloDoSetor,
  caminhoDoArco,
  caminhoDoSetor,
  posicaoDoBotao,
} from '@/app/roda-da-barra/geometria-da-roda'
import { SeletorTemaDaRoda } from '@/app/roda-da-barra/seletor-tema-da-roda'
import type { OrigemDaRoda } from '@/app/roda-da-barra/use-roda-da-barra'

export interface SetorDaRoda {
  nome: string
  icone: LucideIcon
  /** Classe de traço do arco externo (ex.: `stroke-roda-grupos`). */
  classeDoArco: string
  /** Destino ao escolher. Sem `para` e sem `isTema`, o setor é reservado ("Em breve"). */
  para?: string
  /** O setor Tema não navega: abre o mini-seletor de aparência. */
  isTema?: boolean
  isAtiva?: boolean
  /** Contador pequeno no setor (some quando é 0). */
  selo?: number
  /** Lembrete: bolinha laranja no setor, com o texto na descrição do botão. */
  aviso?: string
}

const MARGEM_DA_TELA = 8
/** Vão entre a borda da barra e a meia-roda, coberto pela ponte invisível. */
const VAO_DA_BARRA = 8

interface Posicao {
  top: number
  left: number
  /** Largura da ponte invisível: do item até a meia-roda (recuo da barra + vão). */
  ponte: number
}

function calcularPosicao(ancora: HTMLElement): Posicao {
  const retangulo = ancora.getBoundingClientRect()
  const bordaDaBarra = ancora.closest('aside')?.getBoundingClientRect().right ?? retangulo.right
  const centro = retangulo.top + retangulo.height / 2
  // Meia-roda e etiqueta sempre dentro da janela, com margem.
  const maximo = window.innerHeight - ALTURA_DA_RODA - ALTURA_DA_ETIQUETA - MARGEM_DA_TELA
  return {
    top: Math.max(MARGEM_DA_TELA, Math.min(centro - ALTURA_DA_RODA / 2, maximo)),
    left: retangulo.right,
    ponte: Math.max(0, bordaDaBarra - retangulo.right) + VAO_DA_BARRA,
  }
}

function isReservado(setor: SetorDaRoda) {
  return !setor.para && !setor.isTema
}

interface RodaDaBarraProps {
  /** Nome do grupo (Calendário, Organização, Ajustes, Dados): rótulo do menu e da etiqueta. */
  nome: string
  setores: SetorDaRoda[]
  /** Item da barra que abriu a roda: dá a posição e recebe o foco de volta. */
  ancoraRef: RefObject<HTMLElement | null>
  origem: OrigemDaRoda
  onFechar: (isDevolverFoco: boolean) => void
  /** Mini-seletor de tema aberto: a roda não fecha quando o mouse sai. */
  onTravar: (isTravar: boolean) => void
}

/**
 * Meia-roda de N setores (180°/N cada) ao lado da barra lateral, em portal com `position: fixed` (a barra corta o
 * que transborda). Os eventos do portal sobem pela árvore do React, então o hover continua contínuo
 * entre o item da barra e a meia-roda. Um recuo transparente faz a ponte entre os dois.
 */
export function RodaDaBarra({
  nome,
  setores,
  ancoraRef,
  origem,
  onFechar,
  onTravar,
}: RodaDaBarraProps) {
  const navigate = useNavigate()
  const caixaRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [posicao, setPosicao] = useState<Posicao | null>(null)
  const [indiceSobMouse, setIndiceSobMouse] = useState<number | null>(null)
  const [indiceEmFoco, setIndiceEmFoco] = useState<number | null>(null)
  const [isTemaAberto, setIsTemaAberto] = useState(false)

  useLayoutEffect(() => {
    const ancora = ancoraRef.current
    if (!ancora) return
    const handleReposicionar = () => setPosicao(calcularPosicao(ancora))
    handleReposicionar()
    window.addEventListener('resize', handleReposicionar)
    return () => window.removeEventListener('resize', handleReposicionar)
  }, [ancoraRef])

  // Pelo teclado, o foco vai ao primeiro setor assim que a roda aparece.
  useEffect(() => {
    if (origem !== 'teclado' || !posicao) return
    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]:not(:disabled)')?.focus()
  }, [origem, posicao])

  useEffect(() => {
    onTravar(isTemaAberto)
  }, [isTemaAberto, onTravar])
  useEffect(() => () => onTravar(false), [onTravar])

  // Clicar fora (da roda e do item que a abriu) fecha.
  useEffect(() => {
    function handleApertarFora(evento: PointerEvent) {
      const alvo = evento.target as Node
      if (caixaRef.current?.contains(alvo) || ancoraRef.current?.contains(alvo)) return
      onFechar(false)
    }
    document.addEventListener('pointerdown', handleApertarFora)
    return () => document.removeEventListener('pointerdown', handleApertarFora)
  }, [ancoraRef, onFechar])

  function handleEscolher(setor: SetorDaRoda) {
    if (setor.isTema) {
      setIsTemaAberto((isAberto) => !isAberto)
      return
    }
    if (!setor.para) return
    navigate(setor.para)
    onFechar(false)
  }

  function botaoDoTema() {
    return menuRef.current?.querySelector<HTMLElement>('[data-setor-tema]')
  }

  function handleTeclaNaCaixa(evento: KeyboardEvent<HTMLDivElement>) {
    if (evento.key !== 'Escape') return
    evento.preventDefault()
    if (isTemaAberto) {
      setIsTemaAberto(false)
      botaoDoTema()?.focus()
      return
    }
    onFechar(true)
  }

  /** Setas percorrem os setores de cima para baixo (↓/→ avança, ↑/← volta); Home/End às pontas. */
  function handleSetas(evento: KeyboardEvent<HTMLDivElement>) {
    const botoes = [
      ...(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)') ?? []),
    ]
    const atual = botoes.indexOf(document.activeElement as HTMLElement)
    const total = botoes.length
    const proximo = {
      ArrowDown: atual + 1,
      ArrowRight: atual + 1,
      ArrowUp: atual - 1,
      ArrowLeft: atual - 1,
      Home: 0,
      End: total - 1,
    }[evento.key]
    if (proximo === undefined || total === 0) return
    evento.preventDefault()
    botoes[(proximo + total) % total]?.focus()
  }

  // O foco saiu da roda (Tab) para fora dela e do item: fecha.
  function handlePerderFoco(evento: FocusEvent<HTMLDivElement>) {
    const destino = evento.relatedTarget
    if (!destino) return
    if (caixaRef.current?.contains(destino) || ancoraRef.current?.contains(destino)) return
    onFechar(false)
  }

  if (!posicao) return null

  const indiceEmDestaque = indiceSobMouse ?? indiceEmFoco
  const setorEmDestaque = indiceEmDestaque === null ? undefined : setores[indiceEmDestaque]
  let textoDaEtiqueta = nome
  if (setorEmDestaque) {
    textoDaEtiqueta = isReservado(setorEmDestaque) ? 'Em breve' : setorEmDestaque.nome
  }

  return createPortal(
    <div
      ref={caixaRef}
      data-roda-da-barra=""
      onKeyDown={handleTeclaNaCaixa}
      onBlur={handlePerderFoco}
      style={{ top: posicao.top, left: posicao.left, paddingLeft: posicao.ponte }}
      className="fixed z-50"
    >
      <div className="relative origin-left animate-[roda-entrar_160ms_cubic-bezier(0.22,1,0.36,1)] motion-reduce:animate-none">
        <div
          ref={menuRef}
          role="menu"
          aria-label={nome}
          aria-orientation="vertical"
          onKeyDown={handleSetas}
          className="relative h-[192px] w-[96px]"
        >
          <svg
            aria-hidden
            viewBox="0 -96 96 192"
            className="absolute inset-0 size-full drop-shadow-[0_12px_22px_var(--sombra-roda)]"
          >
            {setores.map((setor, indice) => {
              const angulo = anguloDoSetor(indice, setores.length)
              const isReservadoSetor = isReservado(setor)
              const isEmDestaque = indiceEmDestaque === indice && !isReservadoSetor
              return (
                <g key={setor.nome} className={cn(isReservadoSetor && 'opacity-45')}>
                  <path
                    d={caminhoDoSetor(angulo, setores.length)}
                    strokeWidth={1}
                    onPointerEnter={() => setIndiceSobMouse(indice)}
                    onPointerLeave={() =>
                      setIndiceSobMouse((atual) => (atual === indice ? null : atual))
                    }
                    onClick={() => handleEscolher(setor)}
                    className={cn(
                      'transition-[fill,stroke] duration-150 motion-reduce:transition-none',
                      isReservadoSetor ? 'cursor-not-allowed' : 'cursor-pointer',
                      isEmDestaque ? 'fill-caneta/25 stroke-caneta' : 'fill-popover stroke-border',
                    )}
                  />
                  <path
                    d={caminhoDoArco(angulo, setores.length)}
                    fill="none"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    className={cn(
                      'pointer-events-none transition-opacity duration-150 motion-reduce:transition-none',
                      setor.classeDoArco,
                      isEmDestaque || setor.isAtiva ? 'opacity-100' : 'opacity-55',
                    )}
                  />
                </g>
              )
            })}
            {/* Furo central: metade fica fora do SVG e é cortada. */}
            <circle
              r={RAIO_DO_FURO}
              strokeWidth={1}
              className="pointer-events-none fill-background stroke-border"
            />
          </svg>

          {setores.map((setor, indice) => {
            const Icone = setor.icone
            const isReservadoSetor = isReservado(setor)
            // Posição calculada pelo ângulo (vale para qualquer N); o resto do visual é classe.
            const posicaoDoBotaoDoSetor = posicaoDoBotao(anguloDoSetor(indice, setores.length))
            const isEmDestaque =
              (indiceEmDestaque === indice || setor.isAtiva === true) && !isReservadoSetor
            const textoDoSelo =
              setor.selo && setor.selo > 0
                ? `${setor.selo} ${setor.selo === 1 ? 'item' : 'itens'}`
                : undefined
            return (
              <button
                key={setor.nome}
                type="button"
                role="menuitem"
                aria-label={isReservadoSetor ? 'Em breve' : setor.nome}
                aria-current={setor.isAtiva ? 'page' : undefined}
                aria-description={setor.aviso ?? textoDoSelo}
                aria-haspopup={setor.isTema ? 'dialog' : undefined}
                aria-expanded={setor.isTema ? isTemaAberto : undefined}
                data-setor-tema={setor.isTema ? '' : undefined}
                disabled={isReservadoSetor}
                onFocus={() => setIndiceEmFoco(indice)}
                onBlur={() => setIndiceEmFoco((atual) => (atual === indice ? null : atual))}
                onClick={() => handleEscolher(setor)}
                style={posicaoDoBotaoDoSetor}
                className={cn(
                  // O mouse usa o setor inteiro (o caminho do SVG); o botão é o alvo do teclado.
                  'pointer-events-none absolute flex size-[34px] items-center justify-center rounded-full transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-caneta motion-reduce:transition-none',
                  isEmDestaque ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                <Icone aria-hidden strokeWidth={1.8} className="size-[18px]" />
                {textoDoSelo && (
                  <span
                    aria-hidden
                    data-selo
                    className="absolute -top-1 -right-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-caneta px-1 text-[0.5625rem] leading-none font-bold text-primary-foreground tabular-nums"
                  >
                    {setor.selo}
                  </span>
                )}
                {setor.aviso && (
                  <span
                    aria-hidden
                    data-aviso
                    className="absolute top-0.5 right-0.5 size-2 rounded-full bg-alerta ring-2 ring-popover"
                  />
                )}
              </button>
            )
          })}
        </div>

        {/* Etiqueta: o destino em destaque ou, sem destaque, o nome do grupo. */}
        <span
          aria-hidden
          className={cn(
            'pointer-events-none absolute top-[196px] left-[46px] -translate-x-1/2 rounded-full border border-border bg-popover px-[11px] py-[5px] text-xs leading-none font-semibold whitespace-nowrap',
            setorEmDestaque ? 'text-foreground' : 'text-muted-foreground',
          )}
        >
          {textoDaEtiqueta}
        </span>

        {isTemaAberto && <SeletorTemaDaRoda className="absolute top-0 left-[104px]" />}
      </div>
    </div>,
    document.body,
  )
}
