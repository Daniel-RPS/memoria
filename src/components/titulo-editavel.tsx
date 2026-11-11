import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Pencil } from 'lucide-react'
import { cn } from 'cn'
import { esquemaTituloTarefa, TAMANHO_MAXIMO_TITULO } from '@/lib/esquemas'
import { TextoComLinks } from '@/components/texto-com-links'
import { linksDoTexto } from '@/domain/links'

interface TituloEditavelProps {
  titulo: string
  isEditando: boolean
  onIniciarEdicao: () => void
  onSalvar: (titulo: string) => void
  onCancelar: () => void
  /** Backspace com o campo já vazio (ex.: apagar a linha e voltar para a anterior). */
  onApagarVazio?: () => void
  /** Endereços de site no título viram links clicáveis (fora da edição). */
  isComLinks?: boolean
  /**
   * Lápis "Editar título" no fim de um título com link (o clique no link abre o site).
   * Desligue onde não cabe (Semana): lá ficam o duplo clique na linha e o menu ⋯.
   */
  isComLapis?: boolean
  className?: string
}

/** Título clicável que vira campo de texto. Enter ou sair do campo salva; Esc cancela. */
export function TituloEditavel({
  titulo,
  isEditando,
  onIniciarEdicao,
  onSalvar,
  onCancelar,
  onApagarVazio,
  isComLinks = false,
  isComLapis = true,
  className,
}: TituloEditavelProps) {
  const isComLinkNaTela = isComLinks && linksDoTexto(titulo).length > 0

  if (isEditando) {
    return (
      <CampoTitulo
        titulo={titulo}
        isSelecionarTudo={isComLinkNaTela}
        onSalvar={onSalvar}
        onCancelar={onCancelar}
        onApagarVazio={onApagarVazio}
      />
    )
  }

  const classe = cn(
    'min-w-0 cursor-text rounded-sm text-left text-base break-words focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-caneta',
    className,
  )

  // Link não pode ficar dentro de <button>: com link, o título vira um "botão" acessível em span.
  if (isComLinkNaTela) {
    return (
      <span className="min-w-0 break-words">
        <span
          role="button"
          tabIndex={0}
          onClick={onIniciarEdicao}
          onKeyDown={(evento) => {
            if (evento.target !== evento.currentTarget) return
            if (evento.key === 'Enter' || evento.key === ' ') {
              evento.preventDefault()
              onIniciarEdicao()
            }
          }}
          className={classe}
        >
          <TextoComLinks texto={titulo} />
        </span>
        {isComLapis && (
          <button
            type="button"
            aria-label="Editar título"
            title="Editar título"
            onClick={onIniciarEdicao}
            className="ml-1 inline-flex size-5 items-center justify-center rounded-sm align-middle text-grafite opacity-0 transition-opacity group-focus-within/cabecalho:opacity-100 group-focus-within/linha:opacity-100 group-hover/cabecalho:opacity-100 group-hover/linha:opacity-100 hover:text-tinta focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-caneta motion-reduce:transition-none"
          >
            <Pencil aria-hidden className="size-3.5" />
          </button>
        )}
      </span>
    )
  }

  return (
    <button type="button" onClick={onIniciarEdicao} className={classe}>
      {titulo}
    </button>
  )
}

type CampoTituloProps = Pick<
  TituloEditavelProps,
  'titulo' | 'onSalvar' | 'onCancelar' | 'onApagarVazio'
> & {
  /** Título com link: abre com tudo selecionado, para colar o endereço certo por cima. */
  isSelecionarTudo: boolean
}

/** Montado a cada edição, então o rascunho sempre parte do título atual. */
function CampoTitulo({
  titulo,
  isSelecionarTudo,
  onSalvar,
  onCancelar,
  onApagarVazio,
}: CampoTituloProps) {
  const [rascunho, setRascunho] = useState(titulo)
  const campoRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Montado a cada edição: roda uma vez, ao abrir o campo.
    if (isSelecionarTudo) campoRef.current?.select()
  }, [isSelecionarTudo])

  function handleSalvar() {
    const resultado = esquemaTituloTarefa.safeParse(rascunho)
    if (resultado.success) onSalvar(resultado.data)
    else onCancelar()
  }

  function handleKeyDown(evento: KeyboardEvent<HTMLInputElement>) {
    if (evento.key === 'Enter') handleSalvar()
    if (evento.key === 'Escape') onCancelar()
    if (evento.key === 'Backspace' && rascunho === '' && onApagarVazio) {
      evento.preventDefault()
      onApagarVazio()
    }
  }

  return (
    <input
      ref={campoRef}
      autoFocus
      aria-label="Nome da tarefa"
      value={rascunho}
      maxLength={TAMANHO_MAXIMO_TITULO}
      onChange={(evento) => setRascunho(evento.target.value)}
      onBlur={handleSalvar}
      onKeyDown={handleKeyDown}
      className="w-full min-w-0 rounded-sm bg-transparent text-base outline-2 outline-offset-2 outline-caneta"
    />
  )
}
