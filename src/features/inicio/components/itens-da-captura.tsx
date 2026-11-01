import type { KeyboardEvent } from 'react'
import { Plus, X } from 'lucide-react'
import type { UseFieldArrayReturn, UseFormRegister } from 'react-hook-form'
import type { CapturaInput } from '@/lib/captura'

interface ItensDaCapturaProps {
  campos: UseFieldArrayReturn<CapturaInput, 'itens'>
  register: UseFormRegister<CapturaInput>
  /** Valor atual de um item (para saber se está vazio). */
  valorDe: (indice: number) => string
  onCriar: () => void
  /** Em "Em grupo…" o campo principal já é o item 1: a lista começa no 2. */
  primeiroNumero?: number
}

/**
 * Itens do grupo, um por linha, logo abaixo do título. Enter numa linha preenchida abre a
 * próxima; Enter na última linha vazia cria o grupo; Backspace numa linha vazia apaga a linha.
 */
export function ItensDaCaptura({
  campos,
  register,
  valorDe,
  onCriar,
  primeiroNumero = 1,
}: ItensDaCapturaProps) {
  const { fields, append, insert, remove } = campos

  function handleKeyDown(evento: KeyboardEvent<HTMLInputElement>, indice: number) {
    const isVazio = valorDe(indice).trim() === ''
    if (evento.key === 'Enter') {
      evento.preventDefault()
      if (isVazio && indice === fields.length - 1) onCriar()
      else insert(indice + 1, { titulo: '' })
    } else if (evento.key === 'Backspace' && isVazio && fields.length > 1) {
      evento.preventDefault()
      remove(indice)
    }
  }

  return (
    <ul aria-label="Itens do grupo" className="mt-3 ml-9 border-l-2 border-pauta pl-4">
      {fields.map((campo, indice) => (
        <li
          key={campo.id}
          className="group/linha flex h-8 items-center gap-2 border-b border-pauta/70"
        >
          <span aria-hidden className="size-3.5 shrink-0 rounded-sm border border-input" />
          <input
            aria-label={`Item ${indice + primeiroNumero}`}
            placeholder={
              indice === 0 ? (primeiroNumero === 1 ? 'Primeiro item' : 'Mais um item') : undefined
            }
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-grafite/70"
            {...register(`itens.${indice}.titulo`)}
            onKeyDown={(evento) => handleKeyDown(evento, indice)}
          />
          {fields.length > 1 && (
            <button
              type="button"
              aria-label={`Tirar item ${indice + primeiroNumero}`}
              onClick={() => remove(indice)}
              className="flex size-6 items-center justify-center rounded text-grafite opacity-0 group-focus-within/linha:opacity-100 group-hover/linha:opacity-100 hover:bg-accent hover:text-tinta"
            >
              <X aria-hidden className="size-3.5" />
            </button>
          )}
        </li>
      ))}
      <li>
        <button
          type="button"
          onClick={() => append({ titulo: '' })}
          className="flex h-8 items-center gap-2 rounded text-sm text-grafite hover:text-tinta"
        >
          <Plus aria-hidden className="size-3.5" /> Adicionar item
        </button>
      </li>
    </ul>
  )
}
