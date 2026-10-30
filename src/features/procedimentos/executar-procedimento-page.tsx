import { Navigate, useParams, useSearchParams } from 'react-router'
import { useHoje } from '@/hooks/use-hoje'
import { ExecucaoProcedimento } from '@/features/procedimentos/components/execucao-procedimento'
import { useExecucao } from '@/features/procedimentos/hooks/use-execucao'

/** Modo execução. `?tarefa=<id>` liga a execução à tarefa agendada no calendário. */
export function ExecutarProcedimentoPage() {
  const { id = '' } = useParams()
  const [parametros] = useSearchParams()
  const hoje = useHoje()
  const { dados, erro } = useExecucao(id, hoje, parametros.get('tarefa') ?? undefined)

  if (erro || dados === null) return <Navigate to="/procedimentos" replace />
  if (!dados) return <p className="text-grafite">Abrindo execução…</p>

  return (
    <ExecucaoProcedimento
      key={dados.execucao.id}
      execucao={dados.execucao}
      procedimento={dados.procedimento}
    />
  )
}
