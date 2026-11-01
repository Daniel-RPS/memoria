import { useRef, useState, type FocusEvent, type KeyboardEvent, type PointerEvent } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Link, useNavigate } from 'react-router'
import { cn } from 'cn'
import type { DataLocal } from '@/db/types'
import { deDataLocal } from '@/lib/datas'
import { nivelDeIntensidade, textoDoQuadrado, type DiaDoMapa } from '@/lib/estatisticas'
import { CORES_DOS_NIVEIS } from '@/features/inicio/components/cores-dos-niveis'

/** Só "Seg", "Qua" e "Sex" à esquerda, como no GitHub (a linha 0 é o domingo). */
const ROTULOS_DAS_LINHAS = ['', 'Seg', '', 'Qua', '', 'Sex', '']

/** Setas: cima/baixo = dia anterior/seguinte; lados = semana anterior/seguinte. */
const PASSO_DA_TECLA: Record<string, number> = {
  ArrowUp: -1,
  ArrowDown: 1,
  ArrowLeft: -7,
  ArrowRight: 7,
}

interface GradeDoMapaProps {
  semanas: DiaDoMapa[][]
  meses: { indice: number; data: DataLocal }[]
  contagem: Map<DataLocal, number>
  faixas: [number, number, number]
  hoje: DataLocal
}

/**
 * Grade do último ano: colunas = semanas (domingo a sábado), um quadrado por dia. Uma dica
 * só acompanha o ponteiro ou o foco; clicar (ou Enter) abre o dia. Um único ponto de Tab:
 * as setas andam pelos dias.
 */
export function GradeDoMapa({ semanas, meses, contagem, faixas, hoje }: GradeDoMapaProps) {
  const navigate = useNavigate()
  const molduraRef = useRef<HTMLDivElement>(null)
  const quadradosRef = useRef(new Map<DataLocal, HTMLAnchorElement>())
  const [dica, setDica] = useState<{ texto: string; x: number; y: number } | null>(null)
  const [focado, setFocado] = useState<DataLocal>(hoje)
  const dias = semanas.flat().filter((dia) => !dia.isFuturo)
  const indiceDoFocado = Math.max(
    0,
    dias.findIndex((dia) => dia.data === focado),
  )
  const rotuloDoMes = new Map(meses.map((mes) => [mes.indice, mes.data]))

  function mostrarDica(alvo: HTMLElement, data: DataLocal) {
    const moldura = molduraRef.current?.getBoundingClientRect()
    const quadrado = alvo.getBoundingClientRect()
    if (!moldura) return
    setDica({
      texto: textoDoQuadrado(contagem.get(data) ?? 0, data),
      x: quadrado.left - moldura.left + quadrado.width / 2,
      y: quadrado.top - moldura.top,
    })
  }

  function handleKeyDown(evento: KeyboardEvent<HTMLDivElement>) {
    const passo = PASSO_DA_TECLA[evento.key]
    let destino: number | undefined
    if (passo !== undefined) destino = indiceDoFocado + passo
    else if (evento.key === 'Home') destino = 0
    else if (evento.key === 'End') destino = dias.length - 1
    if (destino === undefined) return
    evento.preventDefault()
    const dia = dias[Math.min(dias.length - 1, Math.max(0, destino))]
    setFocado(dia.data)
    quadradosRef.current.get(dia.data)?.focus()
  }

  return (
    <div ref={molduraRef} className="relative">
      {/* Meses no topo, na coluna da semana em que cada um começa. */}
      <div
        aria-hidden
        className="grid h-4 grid-flow-col grid-cols-[1.75rem] auto-cols-fr gap-x-[3px] text-[10px] leading-none text-grafite"
      >
        <span />
        {semanas.map((semana, indice) => (
          <span key={semana[0].data} className="relative">
            {rotuloDoMes.has(indice) && (
              <span className="absolute left-0 whitespace-nowrap">
                {format(deDataLocal(rotuloDoMes.get(indice)!), 'MMM', { locale: ptBR })}
              </span>
            )}
          </span>
        ))}
      </div>

      <div
        role="group"
        aria-label="Conclusões por dia no último ano"
        onKeyDown={handleKeyDown}
        onPointerLeave={() => setDica(null)}
        className="grid grid-flow-col grid-cols-[1.75rem] grid-rows-7 auto-cols-fr gap-[3px]"
      >
        {ROTULOS_DAS_LINHAS.map((rotulo, indice) => (
          <span
            key={indice}
            aria-hidden
            className="flex items-center text-[10px] leading-none text-grafite"
          >
            {rotulo}
          </span>
        ))}
        {semanas.flat().map(({ data, isFuturo }) => {
          if (isFuturo) return <span key={data} aria-hidden className="aspect-square" />
          const quantidade = contagem.get(data) ?? 0
          const texto = textoDoQuadrado(quantidade, data)
          return (
            <Link
              key={data}
              ref={(elemento) => {
                if (elemento) quadradosRef.current.set(data, elemento)
                else quadradosRef.current.delete(data)
              }}
              to={`/dia/${data}`}
              aria-label={texto}
              aria-current={data === hoje ? 'date' : undefined}
              data-nivel={nivelDeIntensidade(quantidade, faixas)}
              tabIndex={data === dias[indiceDoFocado]?.data ? 0 : -1}
              onPointerEnter={(evento: PointerEvent<HTMLAnchorElement>) =>
                mostrarDica(evento.currentTarget, data)
              }
              onFocus={(evento: FocusEvent<HTMLAnchorElement>) => {
                setFocado(data)
                mostrarDica(evento.currentTarget, data)
              }}
              onBlur={() => setDica(null)}
              onKeyDown={(evento) => {
                if (evento.key === ' ') {
                  evento.preventDefault()
                  void navigate(`/dia/${data}`)
                }
              }}
              className={cn(
                'aspect-square rounded-[2px] outline-none focus-visible:ring-2 focus-visible:ring-tinta focus-visible:ring-offset-1',
                CORES_DOS_NIVEIS[nivelDeIntensidade(quantidade, faixas)],
                data === hoje && 'ring-1 ring-tinta ring-offset-1 ring-offset-papel',
              )}
            />
          )
        })}
      </div>

      {dica && (
        <div
          role="tooltip"
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+6px)] rounded-md bg-tinta px-2 py-1 text-xs whitespace-nowrap text-papel"
          style={{ left: dica.x, top: dica.y }}
        >
          {dica.texto}
        </div>
      )}
    </div>
  )
}
