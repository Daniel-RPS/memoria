import { useState } from 'react'
import { Plus } from 'lucide-react'
import type { DataLocal } from '@/db/types'
import { NovoGrupo } from '@/features/dia/components/novo-grupo'

interface CartaoNovoGrupoProps {
  data: DataLocal
  isSemAdicionar?: boolean
}

/**
 * Barra tracejada fina "+ Novo grupo", em largura total, no fim da tela.
 * Ao clicar, exibe o campo para criar novo grupo.
 */
export function CartaoNovoGrupo({ data, isSemAdicionar }: CartaoNovoGrupoProps) {
  const [isCriando, setIsCriando] = useState(false)

  if (isSemAdicionar) return null

  if (isCriando) {
    return (
      <article
        aria-label="Criar novo grupo"
        className="w-full rounded-md border border-dashed border-pauta bg-card p-3 transition-colors"
      >
        <NovoGrupo data={data} onCriado={() => setIsCriando(false)} />
      </article>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setIsCriando(true)}
      aria-label="Novo grupo"
      className="flex min-h-10 w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-pauta py-2 text-grafite transition-colors hover:border-caneta/60 hover:text-caneta focus-visible:outline-2 focus-visible:outline-caneta"
    >
      <Plus aria-hidden className="size-4" />
      <span className="text-sm font-medium">Novo grupo</span>
    </button>
  )
}
