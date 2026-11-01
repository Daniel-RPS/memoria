import { useId, type KeyboardEvent } from 'react'
import type { LucideIcon } from 'lucide-react'
import { CalendarFold, ChevronRight } from 'lucide-react'
import { Link } from 'react-router'
import { cn } from 'cn'
import { DicaDaBarra } from '@/app/dica-da-barra'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export interface VisaoDoCalendario {
  para: string
  icone: LucideIcon
  isAtiva: boolean
  nome: string
}

// Subitem tem altura fixa (h-8 + 2px de vão): o indicador desliza em passos de 34px.
const POSICAO_INDICADOR = [
  'translate-y-0',
  'translate-y-[34px]',
  'translate-y-[68px]',
  'translate-y-[102px]',
]
// Ao abrir, os subitens entram um depois do outro; ao fechar, saem juntos.
const ATRASO_ENTRADA = ['delay-0', 'delay-[45ms]', 'delay-[90ms]', 'delay-[135ms]']

/** Setas sobem e descem entre o cabeçalho e os subitens; Home/End vão às pontas. */
function handleSetas(event: KeyboardEvent<HTMLDivElement>) {
  const alvos = [...event.currentTarget.querySelectorAll<HTMLElement>('[data-navegavel]')].filter(
    (elemento) => !elemento.closest('[inert]'),
  )
  const atual = alvos.indexOf(document.activeElement as HTMLElement)
  if (atual === -1) return
  const proximo = {
    ArrowDown: Math.min(atual + 1, alvos.length - 1),
    ArrowUp: Math.max(atual - 1, 0),
    Home: 0,
    End: alvos.length - 1,
  }[event.key]
  if (proximo === undefined) return
  event.preventDefault()
  alvos[proximo]?.focus()
}

interface GrupoCalendarioProps {
  visoes: VisaoDoCalendario[]
  isAberto: boolean
  onAlternar: () => void
}

/**
 * Dia, Semana, Mês e Ano num grupo que abre e fecha. Um traço de caneta corre pela
 * linha-guia até a visão aberta; fechado, o cabeçalho fica destacado se uma delas está aberta.
 */
export function GrupoCalendario({ visoes, isAberto, onAlternar }: GrupoCalendarioProps) {
  const idPainel = useId()
  const indiceAtivo = visoes.findIndex((visao) => visao.isAtiva)
  const visaoAtiva = visoes[indiceAtivo]

  return (
    <div onKeyDown={handleSetas}>
      <button
        type="button"
        data-navegavel
        aria-expanded={isAberto}
        aria-controls={idPainel}
        onClick={onAlternar}
        className={cn(
          'group/cab flex h-8 w-full items-center gap-2.5 rounded-md px-2 text-sm transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-barra-texto',
          !isAberto && visaoAtiva
            ? 'bg-barra-realce text-barra-texto'
            : 'text-barra-suave hover:bg-barra-realce hover:text-barra-texto',
        )}
      >
        <CalendarFold
          aria-hidden
          className="size-4 shrink-0 transition-[scale] duration-300 ease-mola group-hover/cab:scale-110 motion-reduce:transition-none"
        />
        Calendário
        <ChevronRight
          aria-hidden
          className={cn(
            'ml-auto size-3.5 shrink-0 text-barra-suave transition-[rotate] duration-400 ease-mola motion-reduce:transition-none',
            isAberto && 'rotate-90',
          )}
        />
      </button>

      {/* Altura animada por grid (0fr ↔ 1fr); fechado, `inert` e `invisible` tiram os links do Tab. */}
      <div
        id={idPainel}
        inert={!isAberto}
        className={cn(
          'grid transition-[grid-template-rows,opacity,visibility] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
          isAberto ? 'visible grid-rows-[1fr] opacity-100' : 'invisible grid-rows-[0fr] opacity-0',
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <ul className="relative mt-0.5 ml-[1.05rem] flex flex-col gap-0.5 border-l border-barra-borda py-0.5 pl-2">
            <li
              aria-hidden
              className={cn(
                'pointer-events-none absolute top-0.5 right-0 left-2 h-8 rounded-md bg-barra-realce transition-[translate,opacity] duration-500 ease-mola-suave motion-reduce:transition-none',
                visaoAtiva ? POSICAO_INDICADOR[indiceAtivo] : 'opacity-0',
              )}
            >
              {/* O traço fica centrado sobre a linha-guia (borda esquerda da lista). */}
              <span className="absolute top-1.5 -left-[calc(0.5rem+1.5px)] h-5 w-[3px] rounded-full bg-caneta shadow-[0_0_10px_1px_var(--caneta)]" />
            </li>
            {visoes.map((visao, indice) => {
              const Icone = visao.icone
              return (
                <li
                  key={visao.nome}
                  className={cn(
                    'relative transition-[opacity,translate] duration-500 ease-mola motion-reduce:transition-none',
                    isAberto
                      ? cn('translate-x-0 opacity-100', ATRASO_ENTRADA[indice])
                      : '-translate-x-2 opacity-0',
                  )}
                >
                  <Link
                    to={visao.para}
                    data-navegavel
                    aria-current={visao.isAtiva ? 'page' : undefined}
                    className={cn(
                      // Contorno para dentro: o painel corta o que passa da borda (overflow-hidden).
                      'group/sub flex h-8 items-center gap-2.5 rounded-md px-2 text-sm transition-colors duration-200 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-barra-texto',
                      visao.isAtiva
                        ? 'font-semibold text-barra-texto'
                        : 'text-barra-suave hover:bg-barra-realce hover:text-barra-texto',
                    )}
                  >
                    <Icone
                      aria-hidden
                      className="size-4 shrink-0 transition-[translate] duration-300 ease-mola group-hover/sub:translate-x-0.5 motion-reduce:transition-none"
                    />
                    {visao.nome}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </div>
  )
}

/** Barra recolhida: um ícone de calendário que abre as 4 visões num menu ao lado. */
export function GrupoCalendarioRecolhido({ visoes }: { visoes: VisaoDoCalendario[] }) {
  const isNoCalendario = visoes.some((visao) => visao.isAtiva)
  return (
    <DropdownMenu>
      <DicaDaBarra texto="Calendário">
        <DropdownMenuTrigger
          aria-label="Calendário"
          className={cn(
            'flex h-8 items-center justify-center rounded-md focus-visible:outline-2 focus-visible:outline-barra-texto',
            isNoCalendario
              ? 'bg-caneta text-primary-foreground'
              : 'text-barra-suave hover:bg-barra-realce hover:text-barra-texto data-[state=open]:bg-barra-realce',
          )}
        >
          <CalendarFold aria-hidden className="size-4" />
        </DropdownMenuTrigger>
      </DicaDaBarra>
      <DropdownMenuContent side="right" align="start" sideOffset={10} className="w-40">
        {visoes.map((visao) => {
          const Icone = visao.icone
          return (
            <DropdownMenuItem
              key={visao.nome}
              asChild
              className={cn(visao.isAtiva && 'font-semibold text-violeta-profundo')}
            >
              <Link to={visao.para} aria-current={visao.isAtiva ? 'page' : undefined}>
                <Icone aria-hidden className={cn('size-4', visao.isAtiva && 'text-caneta')} />
                {visao.nome}
              </Link>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
