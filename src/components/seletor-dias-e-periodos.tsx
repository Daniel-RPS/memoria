import { useState, useRef, useEffect, useId } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, Plus, X } from 'lucide-react'
import { cn } from 'cn'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { DataLocal } from '@/db/types'
import {
  deDataLocal,
  diasEntre,
  somarDias,
} from '@/lib/datas'
import {
  agruparDiasEmIntervalos,
  expandirIntervalosEmDias,
  formatarDataInput,
  interpretarLinhaDePeriodo,
  normalizarDias,
  rotuloBotaoEscolher,
  type IntervaloDeDias,
} from '@/domain/periodo'
import {
  iniciaisDosDias,
  inicioDoMes,
  semanasDoMes,
  somarMeses,
} from '@/lib/calendario'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export interface SeletorDiasEPeriodosProps {
  /** Dias atualmente selecionados/aplicados. */
  diasSelecionados: Set<DataLocal> | DataLocal[]
  hoje: DataLocal
  /** Dias com dados/tarefas para desenhar a bolinha indicativa. */
  diasComDados?: Set<DataLocal>
  onAplicar: (dias: DataLocal[]) => void
  isAtivo?: boolean
  className?: string
}

interface LinhaPeriodoEstado {
  id: string
  de: string
  ate: string
  erro?: string
}

export function SeletorDiasEPeriodos({
  diasSelecionados,
  hoje,
  diasComDados,
  onAplicar,
  isAtivo,
  className,
}: SeletorDiasEPeriodosProps) {
  const [isAberto, setIsAberto] = useState(false)
  const gatilhoRef = useRef<HTMLButtonElement>(null)

  // Rascunho de dias selecionados
  const [rascunhoDias, setRascunhoDias] = useState<Set<DataLocal>>(() => new Set())

  // Mês visível no calendário
  const [mesVisivel, setMesVisivel] = useState<DataLocal>(() => inicioDoMes(hoje))

  // Linhas do quadro de períodos
  const [linhasPeriodo, setLinhasPeriodo] = useState<LinhaPeriodoEstado[]>([])

  // Estado de arrasto do mouse no calendário
  const isArrastandoRef = useRef(false)
  const modoArrastoRef = useRef<'marcar' | 'desmarcar'>('marcar')
  const shiftNoArrastoRef = useRef(false)
  const rascunhoBaseArrastoRef = useRef<Set<DataLocal>>(new Set())
  const ultimoDiaArrastadoRef = useRef<DataLocal | null>(null)

  const idDica = useId()

  const diasNormalizados = normalizarDias(diasSelecionados)
  const rotuloAtual = rotuloBotaoEscolher(diasNormalizados)

  // Ao abrir o popover, inicializa o rascunho com a seleção atual se o botão estiver ativo
  function handleOpenChange(aberto: boolean) {
    if (aberto) {
      const iniciais = isAtivo ? new Set(diasNormalizados) : new Set<DataLocal>()
      setRascunhoDias(iniciais)
      sincronizarLinhasDePeriodo(iniciais)

      // Se houver algum dia selecionado, navega para o mês do primeiro dia
      if (iniciais.size > 0) {
        const primeiro = Array.from(iniciais).sort()[0]
        setMesVisivel(inicioDoMes(primeiro))
      } else {
        setMesVisivel(inicioDoMes(hoje))
      }
    } else {
      // Ao fechar sem aplicar, rascunho é descartado
      // e o popover devolve o foco ao botão "Escolher…"
      setTimeout(() => {
        gatilhoRef.current?.focus()
      }, 0)
    }
    setIsAberto(aberto)
  }

  // Gera linhas a partir do set de dias
  function sincronizarLinhasDePeriodo(dias: Set<DataLocal>) {
    const intervalos = agruparDiasEmIntervalos(dias)
    const novasLinhas: LinhaPeriodoEstado[] = intervalos.map((int, i) => ({
      id: `${int.inicio}_${int.fim}_${i}`,
      de: formatarDataInput(int.inicio),
      ate: formatarDataInput(int.fim),
    }))
    setLinhasPeriodo(novasLinhas)
  }

  // Atualiza o rascunho de dias e as linhas
  function atualizarRascunho(novosDias: Set<DataLocal>, atualizarLinhas = true) {
    setRascunhoDias(novosDias)
    if (atualizarLinhas) {
      sincronizarLinhasDePeriodo(novosDias)
    }
  }

  // Interpolação linear entre dias da mesma grade para preencher lacunas de movimento rápido
  function interpolarDias(dia1: DataLocal, dia2: DataLocal): DataLocal[] {
    const delta = diasEntre(dia1, dia2)
    if (Math.abs(delta) <= 1) return [dia1, dia2]

    // Preenche as datas intermediárias pelo calendário
    const passo = delta > 0 ? 1 : -1
    const resultado: DataLocal[] = []
    let cursor = dia1
    while (cursor !== dia2) {
      resultado.push(cursor)
      cursor = somarDias(cursor, passo)
    }
    resultado.push(dia2)
    return resultado
  }

  const [isArrastando, setIsArrastando] = useState(false)

  // Trata arrasto no documento para garantir que soltar fora encerra
  useEffect(() => {
    function handlePointerUp() {
      if (isArrastandoRef.current) {
        isArrastandoRef.current = false
        setIsArrastando(false)
        ultimoDiaArrastadoRef.current = null
        // Ao finalizar arrasto, sincroniza linhas de períodos
        setRascunhoDias((atuais) => {
          sincronizarLinhasDePeriodo(atuais)
          return atuais
        })
      }
    }

    window.addEventListener('pointerup', handlePointerUp)
    return () => window.removeEventListener('pointerup', handlePointerUp)
  }, [])

  useEffect(() => {
    if (isArrastando) {
      document.body.style.userSelect = 'none'
      return () => {
        document.body.style.userSelect = ''
      }
    }
  }, [isArrastando])

  function handleDiaPointerDown(dia: DataLocal, evento: React.PointerEvent) {
    // Só botão esquerdo
    if (evento.button !== 0) return
    evento.preventDefault()

    const isShift = evento.shiftKey || evento.ctrlKey || evento.metaKey
    const jaMarcado = rascunhoDias.has(dia)

    isArrastandoRef.current = true
    setIsArrastando(true)
    shiftNoArrastoRef.current = isShift
    ultimoDiaArrastadoRef.current = dia

    let base: Set<DataLocal>
    if (!isShift) {
      // Sem Shift, o arrasto substitui o rascunho
      base = new Set<DataLocal>()
      modoArrastoRef.current = 'marcar'
      base.add(dia)
    } else {
      // Com Shift, soma ao que já estava.
      // Se o dia onde começou já estava marcado, desmarca em vez de marcar
      base = new Set(rascunhoDias)
      if (jaMarcado) {
        modoArrastoRef.current = 'desmarcar'
        base.delete(dia)
      } else {
        modoArrastoRef.current = 'marcar'
        base.add(dia)
      }
    }

    rascunhoBaseArrastoRef.current = base
    atualizarRascunho(base, false)
  }

  function handleDiaPointerEnter(dia: DataLocal) {
    if (!isArrastandoRef.current) return

    const ultimo = ultimoDiaArrastadoRef.current ?? dia
    ultimoDiaArrastadoRef.current = dia

    const cruzados = interpolarDias(ultimo, dia)
    const proximo = new Set(rascunhoBaseArrastoRef.current)

    for (const d of cruzados) {
      if (modoArrastoRef.current === 'marcar') {
        proximo.add(d)
      } else {
        proximo.delete(d)
      }
    }

    rascunhoBaseArrastoRef.current = proximo
    atualizarRascunho(proximo, false)
  }

  function handleDiaClick(dia: DataLocal, evento: React.MouseEvent) {
    // O clique já foi tratado no pointerDown / arrasto
    // Mas se foi clique simples sem arrastar:
    const isShift = evento.shiftKey || evento.ctrlKey || evento.metaKey
    if (!isShift) {
      const proximo = new Set<DataLocal>([dia])
      atualizarRascunho(proximo, true)
    } else {
      const proximo = new Set(rascunhoDias)
      if (proximo.has(dia)) proximo.delete(dia)
      else proximo.add(dia)
      atualizarRascunho(proximo, true)
    }
  }

  function handleDiaKeyDown(dia: DataLocal, evento: React.KeyboardEvent) {
    if (evento.key === 'Enter' || evento.key === ' ') {
      evento.preventDefault()
      const isShift = evento.shiftKey || evento.ctrlKey || evento.metaKey
      if (!isShift) {
        const proximo = new Set<DataLocal>([dia])
        atualizarRascunho(proximo, true)
      } else {
        const proximo = new Set(rascunhoDias)
        if (proximo.has(dia)) proximo.delete(dia)
        else proximo.add(dia)
        atualizarRascunho(proximo, true)
      }
    } else if (evento.key === 'ArrowLeft') {
      evento.preventDefault()
      moverFocoCalendario(dia, -1)
    } else if (evento.key === 'ArrowRight') {
      evento.preventDefault()
      moverFocoCalendario(dia, 1)
    } else if (evento.key === 'ArrowUp') {
      evento.preventDefault()
      moverFocoCalendario(dia, -7)
    } else if (evento.key === 'ArrowDown') {
      evento.preventDefault()
      moverFocoCalendario(dia, 7)
    }
  }

  function moverFocoCalendario(diaAtual: DataLocal, deslocamento: number) {
    const alvo = somarDias(diaAtual, deslocamento)
    // Se saiu do mês visível, navega para o mês do alvo
    if (alvo.slice(0, 7) !== mesVisivel.slice(0, 7)) {
      setMesVisivel(inicioDoMes(alvo))
    }
    // Foca o botão do dia alvo
    setTimeout(() => {
      const btn = document.querySelector<HTMLButtonElement>(`button[data-dia="${alvo}"]`)
      btn?.focus()
    }, 10)
  }

  // Confirmação e reordenação das linhas de período (ao blur ou Enter)
  function confirmarLinhas(linhasParaValidar: LinhaPeriodoEstado[]) {
    let temErro = false
    const intervalosValidos: IntervaloDeDias[] = []
    let primeiroMesParaNavegar: DataLocal | null = null

    const novasLinhas = linhasParaValidar.map((linha) => {
      if (!linha.de.trim() && !linha.ate.trim()) {
        return linha
      }
      const resultado = interpretarLinhaDePeriodo(linha.de, linha.ate)
      if (resultado.erro) {
        temErro = true
        return { ...linha, erro: resultado.erro }
      }
      if (resultado.intervalo) {
        intervalosValidos.push(resultado.intervalo)
        if (!primeiroMesParaNavegar) {
          primeiroMesParaNavegar = inicioDoMes(resultado.intervalo.inicio)
        }
        return {
          ...linha,
          de: formatarDataInput(resultado.intervalo.inicio),
          ate: formatarDataInput(resultado.intervalo.fim),
          erro: undefined,
        }
      }
      return linha
    })

    if (!temErro && intervalosValidos.length > 0) {
      // Reordena e unifica períodos que se sobrepõem ou são vizinhos
      const diasExpandidos = expandirIntervalosEmDias(intervalosValidos)
      const novoSet = new Set(diasExpandidos)
      setRascunhoDias(novoSet)
      sincronizarLinhasDePeriodo(novoSet)

      if (primeiroMesParaNavegar) {
        setMesVisivel(primeiroMesParaNavegar)
      }
    } else {
      setLinhasPeriodo(novasLinhas)
    }
  }

  function handleMudarLinha(id: string, campo: 'de' | 'ate', valor: string) {
    // Formatação de barras automáticas: só dígitos e barras
    let v = valor.replace(/[^\d/]/g, '')
    // Se o usuário está digitando números e atinge 2 ou 5 caracteres, adiciona barra
    if ((v.length === 2 || v.length === 5) && !v.endsWith('/') && !valor.endsWith('/')) {
      // só adiciona se não for apagando
      if (v.split('/').length < 3) {
        v = `${v}/`
      }
    }

    setLinhasPeriodo((atuais) =>
      atuais.map((linha) => (linha.id === id ? { ...linha, [campo]: v, erro: undefined } : linha)),
    )
  }

  function handleRemoverLinha(id: string) {
    const restantes = linhasPeriodo.filter((l) => l.id !== id)
    setLinhasPeriodo(restantes)
    // Recalcula o rascunho de dias sem essa linha
    const intervalosValidos: IntervaloDeDias[] = []
    for (const l of restantes) {
      const res = interpretarLinhaDePeriodo(l.de, l.ate)
      if (res.intervalo) intervalosValidos.push(res.intervalo)
    }
    const dias = expandirIntervalosEmDias(intervalosValidos)
    setRascunhoDias(new Set(dias))
  }

  function handleAdicionarLinha() {
    const novoId = `nova_${Date.now()}`
    setLinhasPeriodo((atuais) => [...atuais, { id: novoId, de: '', ate: '' }])
    setTimeout(() => {
      const input = document.querySelector<HTMLInputElement>(`input[data-linha-de="${novoId}"]`)
      input?.focus()
    }, 50)
  }

  function handleLimpar() {
    setRascunhoDias(new Set())
    setLinhasPeriodo([])
  }

  function handleAplicar() {
    if (temLinhaComErro || rascunhoDias.size === 0) return
    const lista = Array.from(rascunhoDias).sort()
    onAplicar(lista)
    setIsAberto(false)
  }

  const temLinhaComErro = linhasPeriodo.some((l) => l.erro !== undefined)
  const podeAplicar = rascunhoDias.size > 0 && !temLinhaComErro

  const intervalosDoRascunho = agruparDiasEmIntervalos(rascunhoDias)
  const totalDias = rascunhoDias.size
  const totalPeriodos = intervalosDoRascunho.length

  const semanas = semanasDoMes(mesVisivel)
  const mesFormatado = format(deDataLocal(mesVisivel), 'MMMM yyyy', { locale: ptBR }).toLowerCase()

  return (
    <Popover open={isAberto} onOpenChange={handleOpenChange}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger
            ref={gatilhoRef}
            type="button"
            aria-pressed={isAtivo}
            aria-label={
              isAtivo && rotuloAtual !== 'Escolher…'
                ? `Período selecionado: ${rotuloAtual}`
                : 'Escolher dias ou períodos'
            }
            className={cn(
              'inline-flex h-7 items-center gap-1.5 rounded-[5px] px-2.5 text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-caneta max-w-[200px]',
              isAtivo
                ? 'bg-caneta text-primary-foreground'
                : 'text-grafite hover:bg-accent hover:text-tinta',
              className,
            )}
          >
            <CalendarDays aria-hidden className="size-3.5 shrink-0" />
            <span className="truncate">{rotuloAtual}</span>
          </PopoverTrigger>
        </TooltipTrigger>
        {isAtivo && rotuloAtual !== 'Escolher…' && (
          <TooltipContent>
            <p>{rotuloAtual}</p>
          </TooltipContent>
        )}
      </Tooltip>

      <PopoverContent
        align="end"
        collisionPadding={8}
        className="w-[340px] max-h-[calc(100vh-2rem)] p-3 flex flex-col gap-3 overflow-hidden text-sm"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && e.target instanceof HTMLElement) {
            // Se foi enter num input, confirma a linha
            if (e.target.tagName === 'INPUT') {
              confirmarLinhas(linhasPeriodo)
              return
            }
            // Se não foi em botão cancelar/limpar, aplica
            if (podeAplicar && e.target.tagName !== 'BUTTON') {
              e.preventDefault()
              handleAplicar()
            }
          }
        }}
      >
        {/* Topo do popover */}
        <div className="flex flex-col gap-0.5">
          <h3 className="font-semibold text-tinta text-sm">Escolha dias ou períodos</h3>
          <p id={idDica} className="text-[11px] text-grafite/80">
            Shift + clique soma dias · arraste para marcar vários
          </p>
        </div>

        {/* Calendário Mensal */}
        <div className="flex flex-col gap-2 rounded-md border border-pauta p-2 bg-papel/40">
          {/* Navegação de Mês */}
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold capitalize text-tinta">{mesFormatado}</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Mês anterior"
                onClick={() => setMesVisivel(somarMeses(mesVisivel, -1))}
                className="flex size-6 items-center justify-center rounded text-grafite hover:bg-accent hover:text-tinta"
              >
                <ChevronLeft aria-hidden className="size-3.5" />
              </button>
              <button
                type="button"
                aria-label="Próximo mês"
                onClick={() => setMesVisivel(somarMeses(mesVisivel, 1))}
                className="flex size-6 items-center justify-center rounded text-grafite hover:bg-accent hover:text-tinta"
              >
                <ChevronRight aria-hidden className="size-3.5" />
              </button>
            </div>
          </div>

          {/* Cabeçalho dos dias da semana */}
          <div className="grid grid-cols-7 gap-0 text-center text-[10px] font-medium text-grafite">
            {iniciaisDosDias().map((dia) => (
              <span key={dia.completa} title={dia.completa}>
                {dia.curta}
              </span>
            ))}
          </div>

          {/* Grade de dias */}
          <div
            role="grid"
            aria-describedby={idDica}
            className="grid grid-cols-7 gap-y-1 select-none"
          >
            {semanas.flatMap((semana) =>
              semana.map((dia, idxDia) => {
                const diaObj = deDataLocal(dia)
                const isForaDoMes = dia.slice(0, 7) !== mesVisivel.slice(0, 7)
                const isHojeDia = dia === hoje
                const isMarcado = rascunhoDias.has(dia)
                const temDados = diasComDados?.has(dia) ?? false

                // Checa dias anterior e seguinte para arredondamento contínuo da faixa
                const diaAnterior = somarDias(dia, -1)
                const diaSeguinte = somarDias(dia, 1)
                const anteriorMarcado = rascunhoDias.has(diaAnterior)
                const seguinteMarcado = rascunhoDias.has(diaSeguinte)

                // Quebra de linha da semana
                const isPrimeiroDaSemana = idxDia === 0
                const isUltimoDaSemana = idxDia === 6

                const temConexaoEsquerda = isMarcado && anteriorMarcado && !isPrimeiroDaSemana
                const temConexaoDireita = isMarcado && seguinteMarcado && !isUltimoDaSemana

                const nomePorExtenso = format(diaObj, "EEEE, d 'de' MMMM 'de' yyyy", {
                  locale: ptBR,
                })

                return (
                  <div
                    key={dia}
                    className={cn(
                      'relative flex items-center justify-center h-7',
                      // Faixa contínua de fundo
                      isMarcado && 'bg-caneta/20',
                      isMarcado && !temConexaoEsquerda && 'rounded-l-md',
                      isMarcado && !temConexaoDireita && 'rounded-r-md',
                    )}
                  >
                    <button
                      type="button"
                      data-dia={dia}
                      role="gridcell"
                      aria-pressed={isMarcado}
                      aria-label={nomePorExtenso}
                      onPointerDown={(e) => handleDiaPointerDown(dia, e)}
                      onPointerEnter={() => handleDiaPointerEnter(dia)}
                      onClick={(e) => handleDiaClick(dia, e)}
                      onKeyDown={(e) => handleDiaKeyDown(dia, e)}
                      className={cn(
                        'relative flex size-6.5 items-center justify-center text-xs rounded-md transition-colors outline-none cursor-pointer',
                        isMarcado
                          ? 'bg-caneta font-bold text-primary-foreground shadow-xs'
                          : isHojeDia
                            ? 'font-bold text-caneta ring-1 ring-caneta hover:bg-accent'
                            : isForaDoMes
                              ? 'text-grafite/40 hover:bg-accent/50'
                              : 'text-tinta hover:bg-accent',
                      )}
                    >
                      <span>{diaObj.getDate()}</span>
                      {temDados && (
                        <span
                          aria-hidden
                          className={cn(
                            'pointer-events-none absolute bottom-0.5 left-1/2 size-1 -translate-x-1/2 rounded-full',
                            isMarcado ? 'bg-primary-foreground' : 'bg-caneta',
                          )}
                        />
                      )}
                    </button>
                  </div>
                )
              }),
            )}
          </div>
        </div>

        {/* Quadro de Períodos */}
        <div className="flex flex-col gap-1.5 min-h-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-tinta">Períodos</span>
            <button
              type="button"
              onClick={handleAdicionarLinha}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-caneta hover:underline"
            >
              <Plus aria-hidden className="size-3" />
              Adicionar período
            </button>
          </div>

          <div className="flex flex-col gap-1.5 max-h-[120px] overflow-y-auto pr-1">
            {linhasPeriodo.length === 0 ? (
              <p className="text-[11px] text-grafite py-2 text-center">Nenhum período definido.</p>
            ) : (
              linhasPeriodo.map((linha) => (
                <div key={linha.id} className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-[11px] text-grafite shrink-0">De</span>
                    <input
                      type="text"
                      data-linha-de={linha.id}
                      placeholder="dd/mm/aaaa"
                      value={linha.de}
                      onChange={(e) => handleMudarLinha(linha.id, 'de', e.target.value)}
                      onBlur={() => confirmarLinhas(linhasPeriodo)}
                      className={cn(
                        'w-[86px] h-6 rounded border px-1.5 text-xs text-tinta bg-papel outline-none transition-colors focus:ring-1 focus:ring-caneta',
                        linha.erro ? 'border-destructive text-destructive' : 'border-pauta',
                      )}
                    />
                    <span className="text-[11px] text-grafite shrink-0">até</span>
                    <input
                      type="text"
                      placeholder="dd/mm/aaaa"
                      value={linha.ate}
                      onChange={(e) => handleMudarLinha(linha.id, 'ate', e.target.value)}
                      onBlur={() => confirmarLinhas(linhasPeriodo)}
                      className={cn(
                        'w-[86px] h-6 rounded border px-1.5 text-xs text-tinta bg-papel outline-none transition-colors focus:ring-1 focus:ring-caneta',
                        linha.erro ? 'border-destructive text-destructive' : 'border-pauta',
                      )}
                    />
                    <button
                      type="button"
                      aria-label="Remover período"
                      onClick={() => handleRemoverLinha(linha.id)}
                      className="flex size-6 shrink-0 items-center justify-center rounded text-grafite hover:bg-accent hover:text-destructive"
                    >
                      <X aria-hidden className="size-3.5" />
                    </button>
                  </div>
                  {linha.erro && <span className="text-[10px] text-alerta px-1">{linha.erro}</span>}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Rodapé do popover */}
        <div className="flex items-center justify-between border-t border-pauta pt-2.5 mt-auto">
          <span className="text-xs text-grafite tabular-nums">
            {totalDias === 0
              ? 'Nenhum dia'
              : `${totalDias} ${totalDias === 1 ? 'dia' : 'dias'} · ${totalPeriodos} ${totalPeriodos === 1 ? 'período' : 'períodos'}`}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleLimpar}
              className="text-xs font-medium text-grafite hover:text-tinta px-2 py-1 rounded hover:bg-accent transition-colors"
            >
              Limpar
            </button>
            <button
              type="button"
              disabled={!podeAplicar}
              onClick={handleAplicar}
              className={cn(
                'text-xs font-medium px-3 py-1 rounded bg-caneta text-primary-foreground shadow-xs transition-opacity',
                !podeAplicar && 'opacity-50 cursor-not-allowed',
              )}
            >
              Aplicar
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
