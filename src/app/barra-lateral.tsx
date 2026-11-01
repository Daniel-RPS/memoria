import type { LucideIcon } from 'lucide-react'
import {
  Calendar,
  CalendarDays,
  CalendarRange,
  HardDriveDownload,
  ListOrdered,
  PanelLeftClose,
  PanelLeftOpen,
  StickyNote,
  Sun,
  Tags,
} from 'lucide-react'
import { Link, useMatch } from 'react-router'
import { cn } from 'cn'
import { DicaDaBarra } from '@/app/dica-da-barra'
import {
  GrupoCalendario,
  GrupoCalendarioRecolhido,
  type VisaoDoCalendario,
} from '@/app/grupo-calendario'
import { useGrupoCalendarioAberto } from '@/app/use-grupo-calendario-aberto'
import { hoje } from '@/lib/datas'

interface LinkTelaProps {
  para: string
  icone: LucideIcon
  isAtiva: boolean
  isRecolhida: boolean
  children: string
}

// Recolher/expandir: a largura corre com a mesma mola do grupo Calendário.
const TRANSICAO_DA_BARRA = 'duration-400 ease-mola-suave motion-reduce:transition-none'

function LinkTela({ para, icone: Icone, isAtiva, isRecolhida, children }: LinkTelaProps) {
  return (
    <DicaDaBarra texto={children} isLigada={isRecolhida}>
      <Link
        to={para}
        aria-current={isAtiva ? 'page' : undefined}
        className={cn(
          // O ícone fica no lugar enquanto a barra estreita: muda só o recuo, e o nome some
          // por opacidade (continua sendo o nome acessível do link).
          'flex h-8 items-center gap-2.5 overflow-hidden rounded-md text-sm whitespace-nowrap transition-[padding] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-papel',
          TRANSICAO_DA_BARRA,
          isRecolhida ? 'px-4' : 'px-2',
          isAtiva
            ? 'bg-caneta font-semibold text-white'
            : 'text-papel/70 hover:bg-papel/8 hover:text-papel',
        )}
      >
        <Icone aria-hidden className="size-4 shrink-0" />
        <span
          className={cn(
            'transition-opacity duration-200 motion-reduce:transition-none',
            isRecolhida && 'opacity-0',
          )}
        >
          {children}
        </span>
      </Link>
    </DicaDaBarra>
  )
}

interface BarraLateralProps {
  /** Só os ícones, para a tela principal ganhar espaço. Só o usuário muda (botão ou Ctrl+B). */
  isRecolhida: boolean
  onAlternarRecolhida: () => void
}

/** Moldura lateral: nome do app, botão de recolher e as telas. */
export function BarraLateral({ isRecolhida, onAlternarRecolhida }: BarraLateralProps) {
  const rotaDia = useMatch('/dia/:data')
  const rotaSemana = useMatch('/semana/:data')
  const rotaMes = useMatch('/mes/:data')
  const rotaAno = useMatch('/ano/:ano')
  const isNasCategorias = useMatch('/categorias') !== null
  const isNoBackup = useMatch('/backup') !== null
  const isNasNotas = useMatch({ path: '/notas', end: false }) !== null
  const isNosProcedimentos = useMatch({ path: '/procedimentos', end: false }) !== null
  // "Semana", "Mês" e "Ano" abrem o período da data que está aberta; "Dia" abre hoje.
  const dataAberta =
    rotaDia?.params.data ?? rotaSemana?.params.data ?? rotaMes?.params.data ?? hoje()
  const anoAberto = rotaAno?.params.ano ?? dataAberta.slice(0, 4)

  const visoes: VisaoDoCalendario[] = [
    { para: `/dia/${hoje()}`, icone: Sun, isAtiva: rotaDia !== null, nome: 'Dia' },
    {
      para: `/semana/${dataAberta}`,
      icone: CalendarDays,
      isAtiva: rotaSemana !== null,
      nome: 'Semana',
    },
    { para: `/mes/${dataAberta}`, icone: Calendar, isAtiva: rotaMes !== null, nome: 'Mês' },
    { para: `/ano/${anoAberto}`, icone: CalendarRange, isAtiva: rotaAno !== null, nome: 'Ano' },
  ]
  const telas = [
    {
      para: '/procedimentos',
      icone: ListOrdered,
      isAtiva: isNosProcedimentos,
      nome: 'Procedimentos',
    },
    { para: '/notas', icone: StickyNote, isAtiva: isNasNotas, nome: 'Notas' },
    { para: '/categorias', icone: Tags, isAtiva: isNasCategorias, nome: 'Categorias' },
    { para: '/backup', icone: HardDriveDownload, isAtiva: isNoBackup, nome: 'Backup' },
  ]
  const { isAberto, handleAlternar } = useGrupoCalendarioAberto(
    visoes.some((visao) => visao.isAtiva),
  )

  return (
    // O fundo acompanha a página inteira; o conteúdo fica preso no topo ao rolar.
    <div className="shrink-0 bg-tinta">
      <aside
        className={cn(
          // A tela principal é `flex-1`: acompanha a largura a cada quadro, sem pular.
          'sticky top-0 flex h-dvh flex-col overflow-x-hidden overflow-y-auto py-5 transition-[width,padding]',
          TRANSICAO_DA_BARRA,
          isRecolhida ? 'w-16 px-2' : 'w-56 px-3',
        )}
      >
        <div
          className={cn(
            'mb-6 flex items-center',
            isRecolhida ? 'flex-col gap-3' : 'justify-between pl-2',
          )}
        >
          <span className="text-lg font-extrabold tracking-[-0.03em] whitespace-nowrap text-papel">
            {isRecolhida ? (
              <span title="MemorIA">
                M<span className="text-caneta">.</span>
              </span>
            ) : (
              <>
                Memor<span className="text-caneta">IA</span>
              </>
            )}
          </span>
          <DicaDaBarra texto={isRecolhida ? 'Expandir menu' : 'Recolher menu'}>
            <button
              type="button"
              aria-label={isRecolhida ? 'Expandir menu' : 'Recolher menu'}
              aria-keyshortcuts="Control+B"
              onClick={onAlternarRecolhida}
              className="flex size-7 shrink-0 items-center justify-center rounded-md text-papel/50 transition-colors hover:bg-papel/8 hover:text-papel focus-visible:outline-2 focus-visible:outline-papel"
            >
              {isRecolhida ? (
                <PanelLeftOpen aria-hidden className="size-4" />
              ) : (
                <PanelLeftClose aria-hidden className="size-4" />
              )}
            </button>
          </DicaDaBarra>
        </div>
        <nav aria-label="Telas" className="flex flex-col gap-0.5">
          {isRecolhida ? (
            <GrupoCalendarioRecolhido visoes={visoes} />
          ) : (
            <GrupoCalendario visoes={visoes} isAberto={isAberto} onAlternar={handleAlternar} />
          )}
          {telas.map((tela) => (
            <LinkTela
              key={tela.nome}
              para={tela.para}
              icone={tela.icone}
              isAtiva={tela.isAtiva}
              isRecolhida={isRecolhida}
            >
              {tela.nome}
            </LinkTela>
          ))}
        </nav>
      </aside>
    </div>
  )
}
