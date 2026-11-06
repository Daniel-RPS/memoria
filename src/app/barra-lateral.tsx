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
import { useLembreteDeBackup } from '@/hooks/use-lembrete-de-backup'
import { SeletorAparencia } from '@/app/seletor-aparencia'
import simboloMemoriaClaro from '@/assets/simbolo-memoria-claro.png'
import simboloMemoria from '@/assets/simbolo-memoria.png'
import { hoje } from '@/lib/datas'

interface LinkTelaProps {
  para: string
  icone: LucideIcon
  isAtiva: boolean
  isRecolhida: boolean
  /** Lembrete discreto: ponto no ícone, com o texto na dica e na descrição do link. */
  aviso?: string
  /** Total à direita, discreto; some quando é 0 (e com a barra recolhida). */
  contador?: number
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
        aria-description={
          aviso ?? (contador ? `${contador} ${contador === 1 ? 'item' : 'itens'}` : undefined)
        }
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

// Contornos vetoriais do nome "MemorIA" (coordenadas 218..864 × 218 ao lado do símbolo 218×218).
const CAMINHO_MEMOR =
  'M251.2 60H272.5L303.2 121.5L333.8 60H355.1V158.8H339.3V81.2L310.7 137.6H296.2L267 81.2V158.8H251.2ZM381.0 94.9L386.0 90.6L391.0 87.7L397.0 85.6L402.0 84.6L406.0 84.4L414.0 84.7L422.0 86.6L427.0 88.9L433.5 94.0L438.3 100.0L440.5 104.0L442.3 109.0L443.2 113.0L443.8 120.0L443.6 126.0L443.0 126.6L387.0 126.6L386.4 128.0L387.6 134.0L389.5 138.0L391.8 141.0L397.0 145.2L403.0 147.4L410.0 147.9L415.0 147.3L418.0 146.3L424.0 142.3L427.0 137.9L442.0 137.8L442.5 139.0L440.4 144.0L435.0 151.1L430.0 155.3L427.0 157.1L422.0 159.2L417.0 160.4L407.0 161.1L400.0 160.3L393.0 158.3L387.0 155.3L381.0 150.5L376.7 145.0L372.8 137.0L370.7 129.0L370.4 121.0L370.7 116.0L372.6 108.0L376.7 100.0ZM458.2 87.0L459.0 86.4L471.0 86.5L472.0 86.8L472.4 96.0L473.0 96.9L477.5 91.0L484.0 86.6L491.0 84.6L500.0 84.8L506.0 86.6L510.0 88.9L513.3 92.0L517.0 97.5L518.0 97.7L519.6 95.0L523.1 91.0L526.0 88.6L532.0 85.7L538.0 84.6L545.0 84.6L550.0 85.7L555.0 87.9L560.0 92.4L563.1 97.0L565.3 103.0L566.1 108.0L566.6 158.0L566.0 158.7L551.0 158.7L550.5 158.0L550.5 115.0L549.4 107.0L547.2 103.0L545.0 100.9L540.0 98.7L536.0 98.5L530.0 99.7L526.5 102.0L523.7 105.0L522.6 107.0L520.8 112.0L520.3 118.0L520.4 158.0L519.0 158.7L505.0 158.8L504.2 158.0L504.3 115.0L503.4 108.0L501.4 104.0L498.0 100.6L493.0 98.7L490.0 98.6L484.0 99.7L480.4 102.0L476.7 107.0L474.8 113.0L474.3 119.0L474.4 158.0L473.0 158.7L459.0 158.7L458.1 158.0L458.1 155.0ZM591.0 95.2L598.0 89.6L604.0 86.8L612.0 84.8L619.0 84.4L625.0 84.8L635.0 87.7L642.0 91.8L646.6 96.0L651.3 102.0L653.3 106.0L655.3 112.0L656.3 117.0L656.6 123.0L656.2 129.0L653.5 139.0L650.3 145.0L645.0 151.1L640.0 155.1L634.0 158.3L627.0 160.4L618.0 161.1L609.0 160.2L603.0 158.4L597.0 155.3L590.5 150.0L585.8 144.0L582.9 138.0L580.7 131.0L580.0 122.0L580.8 114.0L582.6 108.0L585.6 102.0ZM671.0 87.0L672.0 86.5L684.0 86.4L684.9 87.0L685.3 98.0L686.0 99.1L687.8 96.0L691.0 92.1L697.0 87.7L703.0 85.8L706.0 85.5L712.0 85.6L713.0 85.8L713.5 87.0L713.4 100.0L706.0 100.0L701.0 100.6L698.0 101.6L692.9 105.0L690.5 108.0L688.6 112.0L686.9 120.0L687.0 158.0L686.0 158.8L672.0 158.8L670.8 158.0ZM392.0 103.7L388.9 108.0L387.6 111.0L386.5 115.0L387.0 115.9L427.0 116.0L427.7 115.0L427.4 112.0L424.2 105.0L421.0 101.6L416.0 98.8L410.0 97.5L403.0 97.8L397.0 99.8ZM603.1 104.0L599.7 108.0L597.7 112.0L596.6 115.0L595.8 121.0L596.8 131.0L598.8 136.0L600.8 139.0L604.0 142.5L608.0 145.3L614.0 147.2L622.0 147.3L626.0 146.3L632.0 143.2L635.3 140.0L637.3 137.0L639.1 133.0L640.4 128.0L640.7 123.0L640.3 117.0L638.4 111.0L636.1 107.0L633.0 103.4L629.0 100.6L624.0 98.6L621.0 98.3L618.0 98.1L612.0 98.8L607.0 101.0Z'
const CAMINHO_IA =
  'M725.3 60H744.8V158.8H725.3ZM792.2 60H820.2L858.2 158.8H838L828.6 134.2H784.4L775 158.8H756.2ZM806.5 75.5L791.2 117.4H822Z'

/**
 * Logo completa (expandida) ou só o símbolo (recolhida). O símbolo (PNG 512×512) fica à esquerda e
 * o nome "MemorIA" vem ao lado em SVG ("Memor" com `currentColor`, que segue `--barra-texto` sem
 * re-render nem transição no tema, e "IA" roxo). Ao recolher, a moldura estreita com a mesma mola
 * da barra, cortando o nome.
 */
function LogoDaBarra({ isRecolhida }: { isRecolhida: boolean }) {
  return (
    <span
      data-logo
      className={cn(
        // Expandida: largura da logo a h-8 (proporção 864×218).
        'relative flex h-8 shrink-0 items-center overflow-hidden transition-[width]',
        TRANSICAO_DA_BARRA,
        isRecolhida ? 'w-8' : 'w-[calc(var(--spacing)*8*864/218)]',
      )}
    >
      <img
        src={simboloMemoriaClaro}
        alt="MemorIA"
        className="size-8 shrink-0 object-contain dark:invisible"
      />
      <img
        src={simboloMemoria}
        alt="MemorIA"
        className="invisible absolute inset-y-0 left-0 size-8 shrink-0 object-contain dark:visible"
      />
      <svg
        aria-hidden
        data-logo-nome
        viewBox="218 0 646 218"
        className={cn(
          'h-8 w-auto max-w-none shrink-0 text-barra-texto transition-opacity duration-200 motion-reduce:transition-none',
          isRecolhida && 'opacity-0',
        )}
      >
        <path fill="currentColor" fillRule="evenodd" d={CAMINHO_MEMOR} />
        <path className="fill-caneta" fillRule="evenodd" d={CAMINHO_IA} />
      </svg>
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
  const telas: {
    para: string
    icone: LucideIcon
    isAtiva: boolean
    nome: string
    aviso?: string
    contador?: number
  }[] = [
    {
      para: '/grupos',
      icone: FolderKanban,
      isAtiva: isNosGrupos,
      nome: 'Grupos',
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
