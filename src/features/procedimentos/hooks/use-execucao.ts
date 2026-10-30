import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { iniciarOuRetomarExecucao, obterExecucao } from '@/db/repositories/execution-repository'
import { obterVersao } from '@/db/repositories/procedure-repository'
import { db } from '@/db/database'
import type { DataLocal } from '@/db/types'

/**
 * Abre (ou retoma) a execução do procedimento e devolve a execução e a versão usada.
 * `taskId` só vale se a tarefa existir e for deste procedimento.
 */
export function useExecucao(procedureId: string, hoje: DataLocal, taskIdPedido?: string) {
  const [execucaoId, setExecucaoId] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let isAtivo = true
    async function abrir() {
      const tarefa = taskIdPedido ? await db.tasks.get(taskIdPedido) : undefined
      const taskId = tarefa?.procedureId === procedureId ? tarefa.id : undefined
      try {
        const execucao = await iniciarOuRetomarExecucao({ procedureId, hoje, taskId })
        if (isAtivo) setExecucaoId(execucao.id)
      } catch {
        if (isAtivo) setErro('Procedimento não encontrado.')
      }
    }
    void abrir()
    return () => {
      isAtivo = false
    }
  }, [procedureId, hoje, taskIdPedido])

  const dados = useLiveQuery(async () => {
    if (!execucaoId) return undefined
    const execucao = await obterExecucao(execucaoId)
    if (!execucao) return null
    const procedimento = await obterVersao(procedureId, execucao.versao)
    return procedimento ? { execucao, procedimento } : null
  }, [execucaoId, procedureId])

  return { dados, erro }
}
