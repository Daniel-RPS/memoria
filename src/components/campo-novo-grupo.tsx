import { useMemo, useState } from 'react'
import { z } from 'zod'
import { CampoNovoItem } from '@/components/campo-novo-item'
import { CampoCategoria } from '@/components/seletor-categoria/campo-categoria'
import type { CategoriaEscolhida } from '@/components/seletor-categoria/seletor-categoria'
import { lerRascunho, limparRascunho } from '@/lib/rascunhos'

interface CampoNovoGrupoProps {
  /** Nome acessível do campo, ex.: "Novo grupo em sex, 31". */
  nomeAcessivel?: string
  tamanho?: 'normal' | 'compacto'
  autoFocus?: boolean
  onCriar: (dados: { titulo: string } & CategoriaEscolhida) => Promise<unknown>
  chaveRascunho?: string
}

const esquemaRascunhoNovoGrupo = z.object({
  titulo: z.string(),
  categoryId: z.string().optional(),
})

type RascunhoNovoGrupo = z.infer<typeof esquemaRascunhoNovoGrupo>

/**
 * "+ Novo grupo" com a bolinha de categoria ao lado: a categoria escolhida (ou criada ali
 * mesmo) vai para o grupo criado com Enter. Nome de série existente reusa a série.
 */
export function CampoNovoGrupo({
  nomeAcessivel,
  tamanho = 'normal',
  autoFocus,
  onCriar,
  chaveRascunho,
}: CampoNovoGrupoProps) {
  const rascunhoInicial = useMemo<RascunhoNovoGrupo | null>(() => {
    if (!chaveRascunho) return null
    return lerRascunho(chaveRascunho, esquemaRascunhoNovoGrupo)
  }, [chaveRascunho])

  const [categoria, setCategoria] = useState<CategoriaEscolhida>(() => ({
    categoryId: rascunhoInicial?.categoryId,
  }))

  return (
    <div className="flex items-start gap-1">
      <div className="min-w-0 flex-1">
        <CampoNovoItem
          rotulo="Novo grupo"
          nomeAcessivel={nomeAcessivel}
          tamanho={tamanho}
          autoFocus={autoFocus}
          chaveRascunho={chaveRascunho}
          onCriar={async (t) => {
            if (chaveRascunho) {
              limparRascunho(chaveRascunho)
            }
            await onCriar({ titulo: t, ...categoria })
          }}
        />
      </div>
      <CampoCategoria
        tipo="grupo"
        isCompacto
        rotulo={`Categoria do ${nomeAcessivel ? nomeAcessivel.toLowerCase() : 'novo grupo'}`}
        atual={categoria}
        onEscolher={setCategoria}
        className={tamanho === 'compacto' ? 'mt-0.5' : 'mt-2'}
      />
    </div>
  )
}
