import type { LucideIcon } from 'lucide-react'
import {
  Archive,
  Calendar,
  CalendarDays,
  CalendarRange,
  ChartColumn,
  FolderKanban,
  HardDriveDownload,
  House,
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
import { useTotalArquivados } from '@/hooks/use-arquivados'
import { useTotalDeGrupos } from '@/hooks/use-lista-de-grupos'
import { useLembreteDeBackup } from '@/hooks/use-lembrete-de-backup'
import { SeletorAparencia } from '@/app/seletor-aparencia'
import logoMemoriaClara from '@/assets/logo-memoria-clara.png'
import logoMemoria from '@/assets/logo-memoria.png'
import simboloMemoriaClaro from '@/assets/simbolo-memoria-claro.png'
import simboloMemoria from '@/assets/simbolo-memoria.png'
import { hoje } from '@/lib/datas'
import { textoTotalDeGrupos } from '@/lib/grupos'

interface LinkTelaProps {
  para: string
  icone: LucideIcon
  isAtiva: boolean
  isRecolhida: boolean
  /** Lembrete discreto: ponto no ícone, com o texto na dica e na descrição do link. */
  aviso?: string
  /** Total à direita, discreto; some quando é 0 (e com a barra recolhida). */
  contador?: number
  /** Como o contador é lido (ex.: "2 grupos"); padrão "N itens". */
  textoDoContador?: (total: number) => string
  children: string
}

// Recolher/expandir: a largura corre com a mesma mola do grupo Calendário.
const TRANSICAO_DA_BARRA = 'duration-400 ease-mola-suave motion-reduce:transition-none'

function LinkTela({
  para,
  icone: Icone,
  isAtiva,
  isRecolhida,
  aviso,
  contador,
  textoDoContador = (total) => `${total} ${total === 1 ? 'item' : 'itens'}`,
  children,
}: LinkTelaProps) {
  return (
    <DicaDaBarra
      texto={aviso ? `${children}: ${aviso}` : children}
      isLigada={isRecolhida || aviso !== undefined}
    >
      <Link
        to={para}
        aria-current={isAtiva ? 'page' : undefined}
        aria-description={aviso ?? (contador ? textoDoContador(contador) : undefined)}
        className={cn(
          // O ícone fica no lugar enquanto a barra estreita: muda só o recuo, e o nome some
          // por opacidade (continua sendo o nome acessível do link).
          'flex h-8 items-center gap-2.5 overflow-hidden rounded-md text-sm whitespace-nowrap transition-[padding] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-barra-texto',
          TRANSICAO_DA_BARRA,
          isRecolhida ? 'px-4' : 'px-2',
          isAtiva
            ? 'bg-caneta font-semibold text-primary-foreground'
            : 'text-barra-suave hover:bg-barra-realce hover:text-barra-texto',
        )}
      >
        <span className="relative shrink-0">
          <Icone aria-hidden className="size-4" />
          {aviso && (
            <span
              aria-hidden
              data-aviso
              className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-alerta ring-2 ring-barra"
            />
          )}
        </span>
        <span
          className={cn(
            'transition-opacity duration-200 motion-reduce:transition-none',
            isRecolhida && 'opacity-0',
          )}
        >
          {children}
        </span>
        {contador !== undefined && contador > 0 && (
          <span
            aria-hidden
            data-contador
            className={cn(
              'ml-auto text-xs tabular-nums transition-opacity duration-200 motion-reduce:transition-none',
              isAtiva ? 'text-primary-foreground/80' : 'text-barra-suave',
              isRecolhida && 'opacity-0',
            )}
          >
            {contador}
          </span>
        )}
      </Link>
    </DicaDaBarra>
  )
}

/**
 * Logo completa (expandida) ou só o símbolo (recolhida). O símbolo abre a logo completa, então a
 * moldura estreita com a mesma mola da barra, cortando o nome, e o símbolo quadrado surge por
 * cima no mesmo lugar. Há um par para cada tema (no claro, o "Memor" é tinta; no escuro, branco)
 * e o CSS troca os dois por opacidade junto com o tema. Só a imagem visível é anunciada.
 */
function LogoDaBarra({ isRecolhida }: { isRecolhida: boolean }) {
  return (
    <span
      className={cn(
        // Expandida: largura da logo a h-8 (proporção 864×218 do arquivo recortado).
        'relative block h-8 shrink-0 overflow-hidden transition-[width]',
        TRANSICAO_DA_BARRA,
        isRecolhida ? 'w-8' : 'w-[calc(var(--spacing)*8*864/218)]',
      )}
    >
      <ParDaLogo
        logo={logoMemoriaClara}
        simbolo={simboloMemoriaClaro}
        isRecolhida={isRecolhida}
        className="dark:invisible dark:opacity-0"
      />
      <ParDaLogo
        logo={logoMemoria}
        simbolo={simboloMemoria}
        isRecolhida={isRecolhida}
        className="invisible opacity-0 dark:visible dark:opacity-100"
      />
    </span>
  )
}

interface ParDaLogoProps {
  logo: string
  simbolo: string
  isRecolhida: boolean
  /** Some no tema que não é o seu (`invisible` também tira do leitor de tela). */
  className: string
}

function ParDaLogo({ logo, simbolo, isRecolhida, className }: ParDaLogoProps) {
  return (
    <span
      data-logo
      className={cn(
        'absolute inset-0 transition-[opacity,visibility] duration-200 motion-reduce:transition-none',
        className,
      )}
    >
      <img
        src={logo}
        alt={isRecolhida ? '' : 'MemorIA'}
        aria-hidden={isRecolhida || undefined}
        className={cn(
          'h-8 w-auto max-w-none transition-opacity duration-200 motion-reduce:transition-none',
          isRecolhida && 'opacity-0',
        )}
      />
      <img
        src={simbolo}
        alt={isRecolhida ? 'MemorIA' : ''}
        aria-hidden={!isRecolhida || undefined}
        className={cn(
          'absolute inset-y-0 left-0 size-8 transition-opacity duration-200 motion-reduce:transition-none',
          !isRecolhida && 'opacity-0',
        )}
      />
    </span>
  )
}

interface BarraLateralProps {
  /** Só os ícones, para a tela principal ganhar espaço. Só o usuário muda (botão ou Ctrl+B). */
  isRecolhida: boolean
  onAlternarRecolhida: () => void
}

/** Moldura lateral: nome do app, botão de recolher, as telas e, no rodapé, tema e fundo. */
export function BarraLateral({ isRecolhida, onAlternarRecolhida }: BarraLateralProps) {
  const rotaDia = useMatch('/dia/:data')
  const rotaSemana = useMatch('/semana/:data')
  const rotaMes = useMatch('/mes/:data')
  const rotaAno = useMatch('/ano/:ano')
  const isNoInicio = useMatch('/inicio') !== null
  const isNasCategorias = useMatch('/categorias') !== null
  const isNoBackup = useMatch('/backup') !== null
  const isNosArquivados = useMatch('/arquivados') !== null
  const isNosDados = useMatch('/dados') !== null
  const isNosGrupos = useMatch('/grupos') !== null
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
  const lembreteDeBackup = useLembreteDeBackup()
  const totalArquivados = useTotalArquivados()
  const totalDeGrupos = useTotalDeGrupos()
  const telas: {
    para: string
    icone: LucideIcon
    isAtiva: boolean
    nome: string
    aviso?: string
    contador?: number
    textoDoContador?: (total: number) => string
  }[] = [
    {
      para: '/grupos',
      icone: FolderKanban,
      isAtiva: isNosGrupos,
      nome: 'Grupos',
      contador: totalDeGrupos,
      textoDoContador: textoTotalDeGrupos,
    },
    {
      para: '/procedimentos',
      icone: ListOrdered,
      isAtiva: isNosProcedimentos,
      nome: 'Procedimentos',
    },
    { para: '/notas', icone: StickyNote, isAtiva: isNasNotas, nome: 'Notas' },
    { para: '/categorias', icone: Tags, isAtiva: isNasCategorias, nome: 'Categorias' },
    {
      para: '/arquivados',
      icone: Archive,
      isAtiva: isNosArquivados,
      nome: 'Arquivados',
      contador: totalArquivados,
    },
    {
      para: '/dados',
      icone: ChartColumn,
      isAtiva: isNosDados,
      nome: 'Dados',
    },
    {
      para: '/backup',
      icone: HardDriveDownload,
      isAtiva: isNoBackup,
      nome: 'Backup',
      aviso: lembreteDeBackup,
    },
  ]
  const { isAberto, handleAlternar } = useGrupoCalendarioAberto(
    visoes.some((visao) => visao.isAtiva),
  )

  return (
    // O fundo acompanha a página inteira; o conteúdo fica preso no topo ao rolar.
    <div className="shrink-0 border-r border-barra-borda bg-barra text-barra-texto">
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
          <LogoDaBarra isRecolhida={isRecolhida} />
          <DicaDaBarra texto={isRecolhida ? 'Expandir menu' : 'Recolher menu'}>
            <button
              type="button"
              aria-label={isRecolhida ? 'Expandir menu' : 'Recolher menu'}
              aria-keyshortcuts="Control+B"
              onClick={onAlternarRecolhida}
              className="flex size-7 shrink-0 items-center justify-center rounded-md text-barra-suave transition-colors hover:bg-barra-realce hover:text-barra-texto focus-visible:outline-2 focus-visible:outline-barra-texto"
            >
              {isRecolhida ? (
                <PanelLeftOpen aria-hidden className="size-4" />
              ) : (
                <PanelLeftClose aria-hidden className="size-4" />
              )}
            </button>
          </DicaDaBarra>
        </div>
        <nav aria-label="Telas" className="mb-4 flex flex-1 flex-col gap-0.5">
          <LinkTela para="/inicio" icone={House} isAtiva={isNoInicio} isRecolhida={isRecolhida}>
            Início
          </LinkTela>
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
              aviso={tela.aviso}
              contador={tela.contador}
              textoDoContador={tela.textoDoContador}
            >
              {tela.nome}
            </LinkTela>
          ))}
        </nav>
        <SeletorAparencia isRecolhida={isRecolhida} />
      </aside>
    </div>
  )
}
