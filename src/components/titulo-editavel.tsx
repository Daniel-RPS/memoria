import { useState, type KeyboardEvent } from 'react'
import { cn } from 'cn'
import { esquemaTituloTarefa, TAMANHO_MAXIMO_TITULO } from '@/lib/esquemas'

interface TituloEditavelProps {
  titulo: string
  isEditando: boolean
  onIniciarEdicao: () => void
  onSalvar: (titulo: string) => void
  onCancelar: () => void
  /** Backspace com o campo já vazio (ex.: apagar a linha e voltar para a anterior). */
  onApagarVazio?: () => void
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
  className,
}: TituloEditavelProps) {
  if (isEditando) {
    return (
      <CampoTitulo
        titulo={titulo}
        onSalvar={onSalvar}
        onCancelar={onCancelar}
        onApagarVazio={onApagarVazio}
      />
    )
  }

  return (
    <button
      type="button"
      onClick={onIniciarEdicao}
      className={cn(
        'min-w-0 cursor-text rounded-sm text-left text-base break-words focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-caneta',
        className,
      )}
    >
      {titulo}
    </button>
  )
}

type CampoTituloProps = Pick<
  TituloEditavelProps,
  'titulo' | 'onSalvar' | 'onCancelar' | 'onApagarVazio'
>

/** Montado a cada edição, então o rascunho sempre parte do título atual. */
function CampoTitulo({ titulo, onSalvar, onCancelar, onApagarVazio }: CampoTituloProps) {
  const [rascunho, setRascunho] = useState(titulo)

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
