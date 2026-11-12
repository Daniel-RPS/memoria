import { useState } from 'react'
import { Plus } from 'lucide-react'
import { CampoNovoItem } from '@/components/campo-novo-item'
import { useAcoesGrupo } from '@/features/dia/hooks/use-acoes-grupo'

interface CartaoNovoItemGrupoProps {
  cardId: string
  tituloGrupo: string
}

/**
 * Cartão tracejado "+" no fim da grade de tarefas de um grupo para adicionar novo item.
 */
export function CartaoNovoItemGrupo({ cardId, tituloGrupo }: CartaoNovoItemGrupoProps) {
  const [isCriando, setIsCriando] = useState(false)
  const { criarItem } = useAcoesGrupo()

  if (isCriando) {
    return (
      <div
        data-sem-arrasto=""
        className="flex min-h-[5.5rem] flex-col justify-center rounded-md border border-dashed border-pauta bg-card p-2.5"
      >
        <CampoNovoItem
          autoFocus
          rotulo="Adicionar item"
          nomeAcessivel={`Adicionar item em ${tituloGrupo}`}
          tamanho="compacto"
          onSairVazio={() => setIsCriando(false)}
          onCriar={async (titulo) => {
            await criarItem(cardId, titulo)
            setIsCriando(false)
          }}
        />
      </div>
    )
  }

  return (
    <button
      type="button"
      data-sem-arrasto=""
      onClick={() => setIsCriando(true)}
      aria-label={`Adicionar item em ${tituloGrupo}`}
      className="flex min-h-[5.5rem] flex-col items-center justify-center gap-1 rounded-md border border-dashed border-pauta p-3 text-grafite transition-colors hover:border-caneta/60 hover:text-caneta focus-visible:outline-2 focus-visible:outline-caneta"
    >
      <Plus aria-hidden className="size-4" />
      <span className="text-xs font-medium">Novo item</span>
    </button>
  )
}
