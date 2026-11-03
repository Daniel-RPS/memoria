import { useRef, useState, type KeyboardEvent } from 'react'
import { ChevronDown, Rows3, Search } from 'lucide-react'
import { cn } from 'cn'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { DataLocal } from '@/db/types'
import { useCategoriasDoContexto } from '@/hooks/contexto-categorias'
import { diaEMes } from '@/lib/captura'
import { classificarTarefa } from '@/lib/categorias'
import { filtrarSeries, type SerieParaEscolher } from '@/lib/grupos'

interface SeletorDeGrupoProps {
  series: SerieParaEscolher[]
  seriesId?: string
  data: DataLocal
  /** `undefined` = "Sem grupo". */
  onEscolher: (seriesId: string | undefined) => void
}

const CLASSE_OPCAO =
  'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none hover:bg-accent focus-visible:bg-accent'

function PontoDoGrupo({ serie }: { serie: SerieParaEscolher['serie'] }) {
  const classificacao = classificarTarefa(serie, useCategoriasDoContexto())
  return (
    <span
      aria-hidden
      className={cn('size-2.5 shrink-0 rounded-full', !classificacao && 'border border-grafite/60')}
      style={classificacao ? { backgroundColor: classificacao.cor } : undefined}
    />
  )
}

/**
 * Grupo da captura, ao lado da categoria: "Sem grupo" (tarefa solta) no topo, depois a busca e os
 * grupos usados recentemente primeiro (com a cor da categoria), marcando se o grupo já tem card no
 * dia escolhido. Setas andam da busca para a lista.
 */
export function SeletorDeGrupo({ series, seriesId, data, onEscolher }: SeletorDeGrupoProps) {
  const [isAberto, setIsAberto] = useState(false)
  const [busca, setBusca] = useState('')
  // Depois de escolher, o foco vai para onde quem chamou mandar (não volta ao botão).
  const isEscolheuRef = useRef(false)
  const listaRef = useRef<HTMLUListElement>(null)
  const escolhida = series.find((opcao) => opcao.serie.id === seriesId)
  const visiveis = filtrarSeries(series, busca)

  function handleEscolher(id: string | undefined) {
    isEscolheuRef.current = true
    onEscolher(id)
    setIsAberto(false)
    setBusca('')
  }

  function focarOpcao(indice: number) {
    const opcoes = listaRef.current?.querySelectorAll<HTMLButtonElement>('button')
    if (!opcoes || opcoes.length === 0) return
    opcoes[Math.max(0, Math.min(opcoes.length - 1, indice))].focus()
  }

  function handleKeyDownNaLista(evento: KeyboardEvent<HTMLUListElement>) {
    const opcoes = [...(listaRef.current?.querySelectorAll('button') ?? [])]
    const atual = opcoes.findIndex((opcao) => opcao === document.activeElement)
    if (evento.key === 'ArrowDown') focarOpcao(atual + 1)
    else if (evento.key === 'ArrowUp') {
      if (atual <= 0) listaRef.current?.parentElement?.querySelector('input')?.focus()
      else focarOpcao(atual - 1)
    } else return
    evento.preventDefault()
  }

  return (
    <Popover open={isAberto} onOpenChange={setIsAberto}>
      <PopoverTrigger
        aria-label={`Grupo: ${escolhida?.serie.titulo ?? 'Sem grupo'}`}
        className="flex h-8 max-w-40 items-center gap-1.5 rounded-lg border border-input bg-papel pr-2 pl-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {escolhida ? (
          <PontoDoGrupo serie={escolhida.serie} />
        ) : (
          <Rows3 aria-hidden className="size-3.5 shrink-0 text-grafite" />
        )}
        <span className="truncate">{escolhida?.serie.titulo ?? 'Sem grupo'}</span>
        <ChevronDown aria-hidden className="size-4 shrink-0 text-grafite" />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-72 p-1.5"
        onCloseAutoFocus={(evento) => {
          if (isEscolheuRef.current) evento.preventDefault()
          isEscolheuRef.current = false
        }}
      >
        <label className="flex items-center gap-2 rounded-md border border-input px-2">
          <Search aria-hidden className="size-3.5 text-grafite" />
          <input
            autoFocus
            value={busca}
            onChange={(evento) => setBusca(evento.target.value)}
            onKeyDown={(evento) => {
              if (evento.key === 'ArrowDown') {
                evento.preventDefault()
                focarOpcao(0)
              } else if (evento.key === 'Enter') {
                evento.preventDefault()
                if (visiveis[0]) handleEscolher(visiveis[0].serie.id)
              }
            }}
            placeholder="Buscar grupo"
            aria-label="Buscar grupo"
            className="h-8 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-grafite/70"
          />
        </label>
        <ul
          ref={listaRef}
          aria-label="Grupos"
          onKeyDown={handleKeyDownNaLista}
          className="mt-1 max-h-64 overflow-y-auto"
        >
          {busca.trim() === '' && (
            <li>
              <button
                type="button"
                aria-current={!seriesId || undefined}
                onClick={() => handleEscolher(undefined)}
                className={cn(CLASSE_OPCAO, !seriesId && 'font-semibold')}
              >
                <Rows3 aria-hidden className="size-3.5 shrink-0 text-grafite" />
                <span className="min-w-0 flex-1 truncate">Sem grupo</span>
              </button>
            </li>
          )}
          {visiveis.map(({ serie, temCardNoDia }) => (
            <li key={serie.id}>
              <button
                type="button"
                aria-current={serie.id === seriesId || undefined}
                onClick={() => handleEscolher(serie.id)}
                className={cn(CLASSE_OPCAO, serie.id === seriesId && 'font-semibold')}
              >
                <PontoDoGrupo serie={serie} />
                <span className="min-w-0 flex-1 truncate">{serie.titulo}</span>
                {temCardNoDia && (
                  <span className="shrink-0 text-xs text-grafite">
                    já existe em {diaEMes(data)}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
        {visiveis.length === 0 && (
          <p className="px-2 py-3 text-sm text-grafite">
            {series.length === 0
              ? 'Nenhum grupo ainda. Crie um pela opção Grupo.'
              : 'Nenhum grupo com esse nome.'}
          </p>
        )}
      </PopoverContent>
    </Popover>
  )
}
