import { CampoNovoGrupo } from '@/components/campo-novo-grupo'
import type { DataLocal } from '@/db/types'
import { useAcoesGrupo } from '@/features/dia/hooks/use-acoes-grupo'

interface NovoGrupoProps {
  data: DataLocal
}

/** Campo ao lado de "Nova tarefa": cria um card de grupo no fim do dia. Nome já usado reusa o grupo. */
export function NovoGrupo({ data }: NovoGrupoProps) {
  const { criarGrupo } = useAcoesGrupo()

  return (
    <div className="flex items-center pl-1">
      <div className="min-w-0 flex-1 pl-2">
        <CampoNovoGrupo onCriar={(dados) => criarGrupo({ ...dados, data })} />
      </div>
    </div>
  )
}
