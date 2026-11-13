import { useState, useRef, useEffect, type KeyboardEvent } from 'react'
import { cn } from 'cn'
import { rotuloDaEtapa } from '@/domain/procedimentos'

interface RotuloEtapaProps {
  id: string
  numero: number
  valor?: string
  onChange: (novo: string) => void
  variante?: 'lista' | 'cartao'
}

/**
 * Rótulo da etapa ("Etapa N" ou nome personalizado).
 * Clicar transforma num input de texto. Enter ou blur confirma; Esc cancela.
 */
export function RotuloEtapa({
  id,
  numero,
  valor,
  onChange,
  variante = 'lista',
}: RotuloEtapaProps) {
  const [isEditando, setIsEditando] = useState(false)
  const [rascunho, setRascunho] = useState(valor ?? '')
  const inputRef = useRef<HTMLInputElement>(null)

  const padrao = `Etapa ${numero}`
  const textoExibido = rotuloDaEtapa(numero, valor)

  function iniciarEdicao() {
    setRascunho(valor ?? '')
    setIsEditando(true)
  }

  useEffect(() => {
    if (isEditando) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [isEditando])

  function confirmar() {
    setIsEditando(false)
    const limpo = rascunho.trim()
    onChange(limpo)
  }

  function cancelar() {
    setIsEditando(false)
    setRascunho(valor ?? '')
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      confirmar()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      cancelar()
    }
  }

  if (isEditando) {
    return (
      <input
        ref={inputRef}
        type="text"
        maxLength={40}
        value={rascunho}
        placeholder={padrao}
        onChange={(e) => setRascunho(e.target.value)}
        onBlur={confirmar}
        onKeyDown={handleKeyDown}
        className={cn(
          'rounded border border-caneta/50 bg-background px-1 outline-none focus:ring-1 focus:ring-caneta',
          variante === 'cartao'
            ? 'h-5 text-xs text-grafite'
            : 'h-6 w-28 text-xs leading-5 text-grafite',
        )}
      />
    )
  }

  if (variante === 'cartao') {
    return (
      <label
        htmlFor={id}
        onClick={iniciarEdicao}
        title="Clique para renomear a etapa"
        className="cursor-pointer rounded px-1 py-0.5 text-left text-xs text-grafite tabular-nums transition-colors hover:bg-accent hover:text-tinta focus-within:outline-2 focus-within:outline-caneta"
      >
        {textoExibido}
      </label>
    )
  }

  return (
    <label
      htmlFor={id}
      onClick={iniciarEdicao}
      title="Clique para renomear a etapa"
      className="w-24 shrink-0 cursor-pointer rounded px-1 pt-[7px] pb-1.5 text-left text-xs leading-5 whitespace-nowrap text-grafite tabular-nums transition-colors hover:bg-accent hover:text-tinta focus-within:outline-2 focus-within:outline-caneta"
    >
      <span className="block truncate">{textoExibido}</span>
    </label>
  )
}
