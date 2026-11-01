import { CampoNovoGrupo } from '@/components/campo-novo-grupo'
import type { DataLocal } from '@/db/types'
import type { FiltroCategoria } from '@/lib/categorias'
import { useAcoesGrupo } from '@/features/dia/hooks/use-acoes-grupo'

interface NovoGrupoProps {
  data: DataLocal
  /** Com um filtro ativo, o grupo novo já nasce naquela categoria. */
  filtro: FiltroCategoria
}

/** Campo ao lado de "Nova tarefa": cria um card de grupo no fim do dia. Nome já usado reusa o grupo. */
export function NovoGrupo({ data, filtro }: NovoGrupoProps) {
  const { criarGrupo } = useAcoesGrupo()

  return (
    <div className="flex items-center pl-1">
      <div className="min-w-0 flex-1 pl-2">
        <CampoNovoGrupo
          key={`${filtro.categoriaId}/${filtro.subcategoriaId}`}
          categoriaInicial={{
            categoryId: filtro.categoriaId,
            subcategoryId: filtro.subcategoriaId,
          }}
          onCriar={(dados) => criarGrupo({ ...dados, data })}
        />
      </div>
    </div>
  )
}
