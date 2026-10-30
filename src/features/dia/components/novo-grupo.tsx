import { CampoNovoItem } from '@/components/campo-novo-item'
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
        <CampoNovoItem
          rotulo="Novo grupo"
          onCriar={(titulo) =>
            criarGrupo({
              titulo,
              data,
              categoryId: filtro.categoriaId,
              subcategoryId: filtro.subcategoriaId,
            })
          }
        />
      </div>
    </div>
  )
}
