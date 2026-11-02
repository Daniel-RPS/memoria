import { useState } from 'react'
import { CalendarDays, Check, ChevronDown, X } from 'lucide-react'
import { ptBR } from 'react-day-picker/locale'
import { cn } from 'cn'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { DataLocal } from '@/db/types'
import { deDataLocal, paraDataLocal } from '@/lib/datas'
import {
  QUALQUER_DIA,
  intervaloDoFiltro,
  rotuloDoAtalho,
  rotuloDoFiltro,
  type AtalhoDeData,
  type FiltroDeData,
} from '@/lib/filtro-de-data'

export const GATILHO_DE_FILTRO =
  'flex h-8 items-center gap-1.5 rounded-md px-2 text-sm text-grafite outline-none hover:bg-accent hover:text-tinta focus-visible:ring-3 focus-visible:ring-ring/50 data-[state=open]:bg-accent'

const OPCAO =
  'flex h-8 w-full items-center gap-2 rounded-sm px-2 text-left text-sm outline-none hover:bg-accent focus-visible:bg-accent'

interface SeletorDeDiaProps {
  filtro: FiltroDeData
  onMudar: (filtro: FiltroDeData) => void
  /** Atalhos oferecidos, na ordem (Notas não tem "Este mês"). */
  atalhos: readonly AtalhoDeData[]
  hoje: DataLocal
  /** "Criado em": o gatilho vira "Criado em: qualquer dia". Sem ele, "Qualquer dia". */
  prefixo?: string
  /** Para o leitor de tela: "Filtrar por dia da edição". */
  rotulo: string
}

function minuscula(texto: string) {
  return texto.charAt(0).toLowerCase() + texto.slice(1)
}

/**
 * Filtro compacto por dia: Qualquer dia, atalhos e "Escolher data…" (calendário; um clique
 * escolhe o dia, o segundo fecha o intervalo). Com filtro ativo, um "×" limpa.
 */
export function SeletorDeDia({
  filtro,
  onMudar,
  atalhos,
  hoje,
  prefixo,
  rotulo,
}: SeletorDeDiaProps) {
  const [isAberto, setIsAberto] = useState(false)
  const [isCalendario, setIsCalendario] = useState(false)
  const escolhido = rotuloDoFiltro(filtro, hoje)
  const texto = prefixo
    ? `${prefixo}: ${minuscula(escolhido ?? 'Qualquer dia')}`
    : (escolhido ?? 'Qualquer dia')
  const intervalo = intervaloDoFiltro(filtro, hoje)

  function handleAbrir(isAbrindo: boolean) {
    setIsAberto(isAbrindo)
    // Abre já no calendário se a escolha atual veio dele.
    if (isAbrindo) setIsCalendario(filtro.tipo === 'periodo')
  }

  function handleEscolher(novo: FiltroDeData) {
    onMudar(novo)
    setIsAberto(false)
  }

  return (
    <div className="flex items-center">
      <Popover open={isAberto} onOpenChange={handleAbrir}>
        <PopoverTrigger aria-label={`${rotulo}: ${texto}`} className={GATILHO_DE_FILTRO}>
          <CalendarDays aria-hidden className="size-3.5" />
          <span className={cn('whitespace-nowrap', escolhido && 'text-tinta')}>{texto}</span>
          <ChevronDown aria-hidden className="size-3.5" />
        </PopoverTrigger>
        <PopoverContent align="end" collisionPadding={8} className="w-auto min-w-48 p-1.5">
          {!isCalendario ? (
            <div role="listbox" aria-label={rotulo} className="flex flex-col">
              {(['qualquer', ...atalhos] as const).map((tipo) => {
                const isAtual = filtro.tipo === tipo
                return (
                  <button
                    key={tipo}
                    type="button"
                    role="option"
                    aria-selected={isAtual}
                    className={OPCAO}
                    onClick={() => handleEscolher(tipo === 'qualquer' ? QUALQUER_DIA : { tipo })}
                  >
                    <Check
                      aria-hidden
                      className={cn('size-4 text-caneta', !isAtual && 'invisible')}
                    />
                    {tipo === 'qualquer' ? 'Qualquer dia' : rotuloDoAtalho(tipo)}
                  </button>
                )
              })}
              <button
                type="button"
                role="option"
                aria-selected={filtro.tipo === 'periodo'}
                className={OPCAO}
                onClick={() => setIsCalendario(true)}
              >
                <Check
                  aria-hidden
                  className={cn('size-4 text-caneta', filtro.tipo !== 'periodo' && 'invisible')}
                />
                Escolher data…
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <p className="px-2 pt-1 text-xs text-grafite">
                Clique num dia; clique em outro para um intervalo.
              </p>
              <Calendar
                mode="range"
                locale={ptBR}
                weekStartsOn={1}
                defaultMonth={deDataLocal(intervalo?.fim ?? hoje)}
                selected={
                  filtro.tipo === 'periodo' && intervalo
                    ? { from: deDataLocal(intervalo.inicio), to: deDataLocal(intervalo.fim) }
                    : undefined
                }
                onSelect={(selecao, diaClicado) => {
                  // Já com um intervalo, o clique recomeça a escolha pelo dia clicado.
                  const recomecar = filtro.tipo === 'periodo' && filtro.inicio !== filtro.fim
                  const inicio = recomecar ? diaClicado : (selecao?.from ?? diaClicado)
                  const fim = recomecar ? diaClicado : (selecao?.to ?? inicio)
                  onMudar({
                    tipo: 'periodo',
                    inicio: paraDataLocal(inicio),
                    fim: paraDataLocal(fim),
                  })
                }}
              />
              <button
                type="button"
                className={cn(OPCAO, 'justify-center text-grafite hover:text-tinta')}
                onClick={() => setIsCalendario(false)}
              >
                Voltar às opções
              </button>
            </div>
          )}
        </PopoverContent>
      </Popover>
      {filtro.tipo !== 'qualquer' && (
        <button
          type="button"
          aria-label="Limpar filtro de dia"
          title="Limpar filtro de dia"
          onClick={() => onMudar(QUALQUER_DIA)}
          className="flex size-7 items-center justify-center rounded-md text-grafite outline-none hover:bg-accent hover:text-tinta focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <X aria-hidden className="size-3.5" />
        </button>
      )}
    </div>
  )
}
