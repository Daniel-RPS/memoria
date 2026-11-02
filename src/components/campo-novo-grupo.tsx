import { useState } from 'react'
import { CampoNovoItem } from '@/components/campo-novo-item'
import { CampoCategoria } from '@/components/seletor-categoria/campo-categoria'
import type { CategoriaEscolhida } from '@/components/seletor-categoria/seletor-categoria'

interface CampoNovoGrupoProps {
  /** Nome acessível do campo, ex.: "Novo grupo em sex, 31". */
  nomeAcessivel?: string
  tamanho?: 'normal' | 'compacto'
  onCriar: (dados: { titulo: string } & CategoriaEscolhida) => Promise<unknown>
}

/**
 * "+ Novo grupo" com a bolinha de categoria ao lado: a categoria escolhida (ou criada ali
 * mesmo) vai para o grupo criado com Enter. Nome de série existente reusa a série.
 */
export function CampoNovoGrupo({
  nomeAcessivel,
  tamanho = 'normal',
  onCriar,
}: CampoNovoGrupoProps) {
  const [categoria, setCategoria] = useState<CategoriaEscolhida>({})

  return (
    <div className="flex items-start gap-1">
      <div className="min-w-0 flex-1">
        <CampoNovoItem
          rotulo="Novo grupo"
          nomeAcessivel={nomeAcessivel}
          tamanho={tamanho}
          onCriar={(titulo) => onCriar({ titulo, ...categoria })}
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
