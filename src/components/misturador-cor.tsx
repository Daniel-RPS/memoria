import { useId, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Tema } from '@/lib/aparencia'
import {
  corNaTela,
  hexParaHsv,
  hsvParaHex,
  lerHex,
  PAPEL_DO_TEMA,
  temasComPoucoContraste,
  type Hsv,
} from '@/lib/cores'

interface MisturadorCorProps {
  /** Cor de partida (a escolhida agora ou uma da paleta). */
  corInicial: string
  /** Nome mostrado na prévia, na cor escolhida. */
  nomeAmostra: string
  onAplicar: (cor: string) => void
  onCancelar: () => void
}

/** Passo das setas (1%) e com Shift (10%). */
const PASSO = 0.01
const PASSO_LONGO = 0.1

const limitar = (valor: number, minimo = 0, maximo = 1) => Math.min(maximo, Math.max(minimo, valor))
const porcento = (valor: number) => `${Math.round(valor * 100)}%`

const AVISO_DE_CONTRASTE: Record<string, string> = {
  claro: 'Pouco contraste no tema claro',
  escuro: 'Pouco contraste no tema escuro',
  'claro,escuro': 'Pouco contraste nos dois temas',
}

/** Posição do ponteiro dentro do elemento, de 0 a 1 em cada eixo. */
function posicaoRelativa(evento: PointerEvent<HTMLElement>) {
  const caixa = evento.currentTarget.getBoundingClientRect()
  return {
    x: limitar((evento.clientX - caixa.left) / caixa.width),
    y: limitar((evento.clientY - caixa.top) / caixa.height),
  }
}

/** Arrastar com o ponteiro capturado: segue mesmo saindo da área. */
function useArrastar(onMover: (posicao: { x: number; y: number }) => void) {
  return {
    onPointerDown: (evento: PointerEvent<HTMLElement>) => {
      evento.preventDefault()
      evento.currentTarget.setPointerCapture(evento.pointerId)
      evento.currentTarget.focus()
      onMover(posicaoRelativa(evento))
    },
    onPointerMove: (evento: PointerEvent<HTMLElement>) => {
      if (evento.currentTarget.hasPointerCapture(evento.pointerId)) {
        onMover(posicaoRelativa(evento))
      }
    },
  }
}

/** Seta → quanto somar em cada eixo (x para a direita, y para cima). */
function deslocamentoDaSeta(evento: KeyboardEvent) {
  const passo = evento.shiftKey ? PASSO_LONGO : PASSO
  const mapa: Record<string, [number, number]> = {
    ArrowLeft: [-passo, 0],
    ArrowRight: [passo, 0],
    ArrowUp: [0, passo],
    ArrowDown: [0, -passo],
  }
  return mapa[evento.key]
}

/**
 * Misturador de qualquer cor: área de saturação × brilho, barra de matiz, campo hexadecimal
 * e prévia nos dois temas. Enter aplica, Esc cancela; as teclas não escapam para menu ou
 * formulário em volta. Só React, CSS e pointer events.
 */
export function MisturadorCor({
  corInicial,
  nomeAmostra,
  onAplicar,
  onCancelar,
}: MisturadorCorProps) {
  const idHex = useId()
  const idErro = useId()
  const [hsv, setHsv] = useState<Hsv>(() => hexParaHsv(lerHex(corInicial) ?? '#3366c2'))
  const [texto, setTexto] = useState(() => hsvParaHex(hsv))
  const hexDigitado = lerHex(texto)
  const cor = hsvParaHex(hsv)
  const isTextoInvalido = hexDigitado === null
  const avisoDeContraste = AVISO_DE_CONTRASTE[temasComPoucoContraste(cor).join(',')]

  function mudarHsv(mudanca: Partial<Hsv>) {
    const novo = { ...hsv, ...mudanca }
    setHsv(novo)
    setTexto(hsvParaHex(novo))
  }

  function handleDigitarHex(valor: string) {
    setTexto(valor)
    const hex = lerHex(valor)
    if (hex) setHsv(hexParaHsv(hex))
  }

  const arrastarArea = useArrastar(({ x, y }) => mudarHsv({ saturacao: x, brilho: 1 - y }))
  const arrastarMatiz = useArrastar(({ x }) => mudarHsv({ matiz: Math.round(x * 360) % 360 }))

  function handleTeclaArea(evento: KeyboardEvent) {
    const deslocamento = deslocamentoDaSeta(evento)
    if (!deslocamento) return
    evento.preventDefault()
    mudarHsv({
      saturacao: limitar(hsv.saturacao + deslocamento[0]),
      brilho: limitar(hsv.brilho + deslocamento[1]),
    })
  }

  function handleTeclaMatiz(evento: KeyboardEvent) {
    const deslocamento = deslocamentoDaSeta(evento)
    if (!deslocamento) return
    evento.preventDefault()
    const passos = (deslocamento[0] + deslocamento[1]) * 100
    mudarHsv({ matiz: (hsv.matiz + passos * 3.6 + 360) % 360 })
  }

  function handleTecla(evento: KeyboardEvent) {
    if (evento.key === 'Enter') {
      evento.preventDefault()
      if (!isTextoInvalido) onAplicar(cor)
    } else if (evento.key === 'Escape') {
      evento.preventDefault()
      onCancelar()
    }
    // Dentro de menu ou formulário: Enter não envia o formulário e as letras não viram busca.
    if (evento.key !== 'Tab') evento.stopPropagation()
  }

  return (
    <div
      role="group"
      aria-label="Misturador de cor"
      onKeyDown={handleTecla}
      className="flex w-56 max-w-full flex-col gap-2.5"
    >
      <div
        role="slider"
        tabIndex={0}
        aria-label="Saturação e brilho"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(hsv.saturacao * 100)}
        aria-valuetext={`Saturação ${porcento(hsv.saturacao)}, brilho ${porcento(hsv.brilho)}`}
        onKeyDown={handleTeclaArea}
        {...arrastarArea}
        className="relative h-32 w-full cursor-crosshair touch-none rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-caneta"
        style={{
          backgroundColor: hsvParaHex({ matiz: hsv.matiz, saturacao: 1, brilho: 1 }),
          backgroundImage:
            'linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent)',
        }}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgb(0_0_0/0.35)]"
          style={{
            left: porcento(hsv.saturacao),
            top: porcento(1 - hsv.brilho),
            backgroundColor: cor,
          }}
        />
      </div>

      <div
        role="slider"
        tabIndex={0}
        aria-label="Matiz"
        aria-valuemin={0}
        aria-valuemax={359}
        aria-valuenow={Math.round(hsv.matiz)}
        aria-valuetext={`${Math.round(hsv.matiz)} graus`}
        onKeyDown={handleTeclaMatiz}
        {...arrastarMatiz}
        className="relative h-3 w-full cursor-ew-resize touch-none rounded-full bg-[linear-gradient(to_right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-caneta"
      >
        <span
          aria-hidden
          className="pointer-events-none absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgb(0_0_0/0.35)]"
          style={{
            left: porcento(hsv.matiz / 360),
            backgroundColor: hsvParaHex({ matiz: hsv.matiz, saturacao: 1, brilho: 1 }),
          }}
        />
      </div>

      <div>
        <div className="flex items-center gap-2">
          <label htmlFor={idHex} className="text-sm text-grafite">
            Hex
          </label>
          <input
            id={idHex}
            value={texto}
            onChange={(evento) => handleDigitarHex(evento.target.value)}
            onBlur={() => !isTextoInvalido && setTexto(cor)}
            aria-label="Código hexadecimal da cor"
            aria-invalid={isTextoInvalido || undefined}
            aria-describedby={isTextoInvalido ? idErro : undefined}
            spellCheck={false}
            autoComplete="off"
            maxLength={9}
            className="h-8 min-w-0 flex-1 rounded-sm border border-pauta bg-papel px-2 font-mono text-sm uppercase focus:border-caneta focus:outline-none aria-invalid:border-destructive"
          />
        </div>
        {isTextoInvalido && (
          <p id={idErro} className="pt-1 text-xs text-destructive">
            Use 6 dígitos, como #3b82f6.
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 overflow-hidden rounded-sm border border-pauta" aria-hidden>
        {(['claro', 'escuro'] as Tema[]).map((tema) => (
          <AmostraNoTema key={tema} tema={tema} cor={cor} nome={nomeAmostra} />
        ))}
      </div>

      {avisoDeContraste && (
        <p role="status" className="flex items-center gap-1.5 text-xs text-grafite">
          <TriangleAlert aria-hidden className="size-3.5 shrink-0" />
          {avisoDeContraste}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button type="button" size="sm" disabled={isTextoInvalido} onClick={() => onAplicar(cor)}>
          Aplicar
        </Button>
      </div>
    </div>
  )
}

/** Bolinha e nome sobre o papel de um tema, com o mesmo ajuste de tom da tela. */
function AmostraNoTema({ tema, cor, nome }: { tema: Tema; cor: string; nome: string }) {
  const corDoTema = corNaTela(cor, tema)
  return (
    <span
      className="flex min-w-0 items-center gap-1.5 px-2 py-1.5 text-xs font-semibold"
      style={{ backgroundColor: PAPEL_DO_TEMA[tema], color: corDoTema }}
      title={`Tema ${tema}`}
    >
      <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: corDoTema }} />
      <span className="truncate">{nome}</span>
    </span>
  )
}
