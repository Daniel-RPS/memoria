import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { Eraser, Undo2 } from 'lucide-react'
import { cn } from 'cn'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface DialogoDesenhoProps {
  isAberto: boolean
  onMudarAberto: (isAberto: boolean) => void
  /** Desenho existente para continuar por cima. */
  inicial?: Blob
  onSalvar: (desenho: Blob) => Promise<unknown>
}

/** Resolução interna da folha; a tela a mostra reduzida, mantendo a proporção. */
const LARGURA = 1200
const ALTURA = 800
const FUNDO = '#ffffff'
/** Quantos passos "Desfazer" guarda (cada um é uma cópia da folha inteira). */
const LIMITE_DESFAZER = 30

const CORES = [
  { nome: 'Tinta', valor: '#1b2838' },
  { nome: 'Caneta azul', valor: '#2343c4' },
  { nome: 'Vermelho', valor: '#c8402f' },
  { nome: 'Verde', valor: '#2f8a57' },
] as const

const ESPESSURAS = [
  { nome: 'Fina', valor: 3 },
  { nome: 'Média', valor: 7 },
  { nome: 'Grossa', valor: 16 },
] as const

/** Tamanho da borracha em relação ao traço escolhido. */
const FATOR_BORRACHA = 3

/** Folha para desenhar à mão livre com mouse, caneta ou dedo. Salva como PNG. */
export function DialogoDesenho({
  isAberto,
  onMudarAberto,
  inicial,
  onSalvar,
}: DialogoDesenhoProps) {
  return (
    <Dialog open={isAberto} onOpenChange={onMudarAberto}>
      <DialogContent className="max-h-[95dvh] w-[min(64rem,calc(100%-2rem))] max-w-none overflow-y-auto sm:max-w-none">
        <DialogHeader>
          <DialogTitle>{inicial ? 'Editar desenho' : 'Novo desenho'}</DialogTitle>
          <DialogDescription>
            Desenhe com o mouse, a caneta ou o dedo. A caneta sensível à pressão afina e engrossa o
            traço.
          </DialogDescription>
        </DialogHeader>
        {isAberto && (
          <Folha
            inicial={inicial}
            onSalvar={async (desenho) => {
              await onSalvar(desenho)
              onMudarAberto(false)
            }}
            onCancelar={() => onMudarAberto(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

interface FolhaProps {
  inicial?: Blob
  onSalvar: (desenho: Blob) => Promise<void>
  onCancelar: () => void
}

function Folha({ inicial, onSalvar, onCancelar }: FolhaProps) {
  const telaRef = useRef<HTMLCanvasElement>(null)
  const historicoRef = useRef<ImageData[]>([])
  const ultimoPontoRef = useRef<{ x: number; y: number } | null>(null)
  const [cor, setCor] = useState<string>(CORES[0].valor)
  const [espessura, setEspessura] = useState<number>(ESPESSURAS[1].valor)
  const [isBorracha, setIsBorracha] = useState(false)
  const [podeDesfazer, setPodeDesfazer] = useState(false)
  const [isSalvando, setIsSalvando] = useState(false)

  const contexto = () => telaRef.current?.getContext('2d') ?? null

  // Prepara a folha: fundo branco e, ao editar, o desenho anterior por baixo.
  useEffect(() => {
    const ctx = telaRef.current?.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = FUNDO
    ctx.fillRect(0, 0, LARGURA, ALTURA)
    if (!inicial || typeof createImageBitmap !== 'function') return
    let isAtivo = true
    void createImageBitmap(inicial).then((imagem) => {
      if (isAtivo) ctx.drawImage(imagem, 0, 0, LARGURA, ALTURA)
      imagem.close()
    })
    return () => {
      isAtivo = false
    }
  }, [inicial])

  function pontoNaFolha(evento: PointerEvent<HTMLCanvasElement>) {
    const caixa = evento.currentTarget.getBoundingClientRect()
    return {
      x: ((evento.clientX - caixa.left) / caixa.width) * LARGURA,
      y: ((evento.clientY - caixa.top) / caixa.height) * ALTURA,
    }
  }

  function guardarParaDesfazer() {
    const ctx = contexto()
    if (!ctx) return
    historicoRef.current = [
      ...historicoRef.current.slice(-(LIMITE_DESFAZER - 1)),
      ctx.getImageData(0, 0, LARGURA, ALTURA),
    ]
    setPodeDesfazer(true)
  }

  function tracar(de: { x: number; y: number }, para: { x: number; y: number }, pressao: number) {
    const ctx = contexto()
    if (!ctx) return
    // Mouse informa pressão 0,5 fixa; caneta varia de 0 a 1.
    const fator = pressao > 0 ? 0.5 + pressao : 1
    ctx.strokeStyle = isBorracha ? FUNDO : cor
    ctx.lineWidth = (isBorracha ? espessura * FATOR_BORRACHA : espessura) * fator
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(de.x, de.y)
    ctx.lineTo(para.x, para.y)
    ctx.stroke()
  }

  function handlePointerDown(evento: PointerEvent<HTMLCanvasElement>) {
    // Captura o ponteiro para o traço continuar mesmo saindo da folha. Se o navegador
    // recusar (ponteiro já liberado), desenha assim mesmo.
    try {
      evento.currentTarget.setPointerCapture(evento.pointerId)
    } catch {
      // Sem captura, o traço só para ao sair da folha.
    }
    guardarParaDesfazer()
    const ponto = pontoNaFolha(evento)
    ultimoPontoRef.current = ponto
    tracar(ponto, ponto, evento.pressure)
  }

  function handlePointerMove(evento: PointerEvent<HTMLCanvasElement>) {
    if (!ultimoPontoRef.current) return
    const ponto = pontoNaFolha(evento)
    tracar(ultimoPontoRef.current, ponto, evento.pressure)
    ultimoPontoRef.current = ponto
  }

  function handlePointerUp() {
    ultimoPontoRef.current = null
  }

  function handleDesfazer() {
    const anterior = historicoRef.current.pop()
    if (anterior) contexto()?.putImageData(anterior, 0, 0)
    setPodeDesfazer(historicoRef.current.length > 0)
  }

  function handleLimpar() {
    const ctx = contexto()
    if (!ctx) return
    guardarParaDesfazer()
    ctx.fillStyle = FUNDO
    ctx.fillRect(0, 0, LARGURA, ALTURA)
  }

  async function handleSalvar() {
    const tela = telaRef.current
    if (!tela) return
    setIsSalvando(true)
    const desenho = await new Promise<Blob | null>((resolver) => tela.toBlob(resolver, 'image/png'))
    if (desenho) await onSalvar(desenho)
    setIsSalvando(false)
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div role="radiogroup" aria-label="Cor" className="flex gap-1.5">
          {CORES.map((opcao) => (
            <button
              key={opcao.valor}
              type="button"
              role="radio"
              aria-checked={!isBorracha && cor === opcao.valor}
              aria-label={opcao.nome}
              onClick={() => {
                setCor(opcao.valor)
                setIsBorracha(false)
              }}
              className={cn(
                'size-7 rounded-full ring-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-caneta',
                !isBorracha && cor === opcao.valor && 'ring-2 ring-tinta',
              )}
              style={{ backgroundColor: opcao.valor }}
            />
          ))}
        </div>
        <div role="radiogroup" aria-label="Espessura" className="flex gap-1">
          {ESPESSURAS.map((opcao) => (
            <Button
              key={opcao.valor}
              type="button"
              size="sm"
              role="radio"
              aria-checked={espessura === opcao.valor}
              variant={espessura === opcao.valor ? 'secondary' : 'ghost'}
              onClick={() => setEspessura(opcao.valor)}
            >
              {opcao.nome}
            </Button>
          ))}
        </div>
        <Button
          type="button"
          size="sm"
          variant={isBorracha ? 'secondary' : 'ghost'}
          aria-pressed={isBorracha}
          onClick={() => setIsBorracha((atual) => !atual)}
        >
          <Eraser /> Borracha
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={!podeDesfazer}
          onClick={handleDesfazer}
        >
          <Undo2 /> Desfazer
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={handleLimpar}>
          Limpar
        </Button>
      </div>

      <canvas
        ref={telaRef}
        width={LARGURA}
        height={ALTURA}
        aria-label="Folha de desenho"
        role="img"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={cn(
          'aspect-[3/2] w-full touch-none rounded-md border border-pauta bg-white',
          isBorracha ? 'cursor-cell' : 'cursor-crosshair',
        )}
      />

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button type="button" onClick={() => void handleSalvar()} disabled={isSalvando}>
          Salvar desenho
        </Button>
      </DialogFooter>
    </>
  )
}
