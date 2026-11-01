import type { LucideIcon } from 'lucide-react'
import {
  Calendar,
  CalendarDays,
  CalendarRange,
  HardDriveDownload,
  ListOrdered,
  StickyNote,
  Sun,
  Tags,
} from 'lucide-react'
import { Link, useMatch } from 'react-router'
import { cn } from 'cn'
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

function LinkTela({ para, icone: Icone, isAtiva, isRecolhida, children }: LinkTelaProps) {
  return (
    <Link
      to={para}
      aria-current={isAtiva ? 'page' : undefined}
      title={isRecolhida ? children : undefined}
      className={cn(
        'flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm focus-visible:outline-2 focus-visible:outline-papel',
        isRecolhida && 'justify-center',
        isAtiva
          ? 'bg-caneta font-semibold text-white'
          : 'text-papel/70 hover:bg-papel/8 hover:text-papel',
      )}
    >
      <Icone aria-hidden className="size-4 shrink-0" />
      <span className={cn(isRecolhida && 'sr-only')}>{children}</span>
    </Link>
  )
}

interface BarraLateralProps {
  /** Só os ícones (na Semana, para as 7 colunas terem largura). */
  isRecolhida: boolean
  /** Recebe o elemento onde a página aberta desenha o que é dela (ex.: filtro do Dia). */
  onAreaDaPagina: (elemento: HTMLElement | null) => void
}

/** Moldura lateral: nome do app, telas e o espaço da página aberta. */
export function BarraLateral({ isRecolhida, onAreaDaPagina }: BarraLateralProps) {
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
          'sticky top-0 flex h-dvh flex-col overflow-y-auto py-5',
          isRecolhida ? 'w-16 px-2' : 'w-56 px-3',
        )}
      >
        <span
          className={cn(
            'mb-6 text-lg font-extrabold tracking-[-0.03em] text-papel',
            isRecolhida ? 'text-center' : 'px-2',
          )}
        >
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
        {!isRecolhida && <div ref={onAreaDaPagina} className="mt-8 empty:hidden" />}
      </aside>
    </div>
  )
}
