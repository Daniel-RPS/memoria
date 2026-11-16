import { useState } from 'react'
import { Plus } from 'lucide-react'
import type { DataLocal } from '@/db/types'
import { NovoGrupo } from '@/features/dia/components/novo-grupo'
import { temRascunho } from '@/lib/rascunhos'

interface CartaoNovoGrupoProps {
  data: DataLocal
  isSemAdicionar?: boolean
}

/**
 * Barra tracejada fina "+ Novo grupo", em largura total, no fim da tela.
 * Ao clicar, exibe o campo para criar novo grupo.
 */
export function CartaoNovoGrupo({ data, isSemAdicionar }: CartaoNovoGrupoProps) {
  const chaveRascunho = `novo-grupo:${data}`
  const [isCriando, setIsCriando] = useState(() => temRascunho(chaveRascunho))

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
      className="flex min-h-10 w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-pauta bg-transparent py-3 text-grafite transition-colors hover:border-caneta/60 hover:text-caneta focus-visible:outline-2 focus-visible:outline-caneta"
    >
      <Plus aria-hidden className="size-4" />
      <span className="text-sm font-medium">Novo grupo</span>
    </button>
  )
}
