import type { KeyboardEvent } from 'react'
import { Trash2 } from 'lucide-react'
import type { UseFormRegisterReturn } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { LinksDoCampo } from '@/components/links-do-campo'

interface LinhaEtapaProps {
  /** Id do campo de texto (o rótulo aponta para ele). */
  id: string
  /** Posição na lista, a partir de 1. */
  numero: number
  campo: UseFormRegisterReturn
  /** Texto atual da etapa: os endereços aparecem como chips clicáveis abaixo do campo. */
  texto: string
  /** Enter: cria a próxima etapa. */
  onCriarProxima: () => void
  /** Backspace com o texto vazio: apaga e volta para a anterior. */
  onApagarVazia: () => void
  onExcluir: () => void
}

/** Uma etapa em linha: "Etapa N" à esquerda, texto editável ali mesmo e lixeira no hover/foco. */
export function LinhaEtapa({
  id,
  numero,
  campo,
  texto,
  onCriarProxima,
  onApagarVazia,
  onExcluir,
}: LinhaEtapaProps) {
  function handleTecla(evento: KeyboardEvent<HTMLTextAreaElement>) {
    if (evento.nativeEvent.isComposing) return
    if (evento.key === 'Enter' && !evento.shiftKey && !evento.ctrlKey && !evento.metaKey) {
      evento.preventDefault()
      onCriarProxima()
    } else if (evento.key === 'Backspace' && evento.currentTarget.value === '') {
      evento.preventDefault()
      onApagarVazia()
    }
  }

  return (
    <li className="group/linha flex items-start gap-2 border-b border-pauta last:border-b-0">
      {/* Mesma altura de linha do texto: "Etapa N" fica no topo da 1ª linha. */}
      <label
        htmlFor={id}
        className="w-16 shrink-0 pt-[9px] pb-2 text-xs leading-5 whitespace-nowrap text-grafite tabular-nums select-none"
      >
        Etapa {numero}
      </label>
      <div className="min-w-0 flex-1">
        <Textarea
          id={id}
          rows={1}
          {...campo}
          onKeyDown={handleTecla}
          placeholder="O que fazer nesta etapa"
          className="min-h-0 min-w-0 resize-none rounded-sm border-transparent bg-transparent px-2 py-1.5 text-base leading-6 shadow-none hover:bg-accent/40 focus-visible:border-caneta/50 focus-visible:bg-card focus-visible:ring-0 md:text-base dark:bg-transparent dark:focus-visible:bg-card"
        />
        <LinksDoCampo texto={texto} className="px-2 pb-2" />
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={`Excluir etapa ${numero}`}
        onClick={onExcluir}
        className="mt-[3px] text-grafite opacity-0 group-focus-within/linha:opacity-100 group-hover/linha:opacity-100 hover:text-tinta focus-visible:opacity-100"
      >
        <Trash2 />
      </Button>
    </li>
  )
}
