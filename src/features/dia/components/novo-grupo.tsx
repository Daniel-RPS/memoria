import { CampoNovoGrupo } from '@/components/campo-novo-grupo'
import type { DataLocal } from '@/db/types'
import { useAcoesGrupo } from '@/features/dia/hooks/use-acoes-grupo'

interface NovoGrupoProps {
  data: DataLocal
  /** Chamado depois de criar (volta ao botão "+ Novo grupo"). */
  onCriado?: () => void
}

/** Campo da seção "Grupos": cria um card no fim do dia. Nome já usado reusa o grupo. */
export function NovoGrupo({ data, onCriado }: NovoGrupoProps) {
  const { criarGrupo } = useAcoesGrupo()

  return (
    <div className="flex items-center pl-1">
      <span className="w-5 shrink-0" />
      <div className="min-w-0 flex-1 pl-2">
        <CampoNovoGrupo
          autoFocus
          onCriar={async (dados) => {
            await criarGrupo({ ...dados, data })
            onCriado?.()
          }}
        />
      </div>
    </div>
  )
}
