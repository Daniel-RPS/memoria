import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  atualizarExecucao,
  iniciarOuRetomarExecucao,
  obterExecucao,
  type MudancasExecucao,
} from '@/db/repositories/execution-repository'
import { obterVersao } from '@/db/repositories/procedure-repository'
import { db } from '@/db/database'
import type { DataLocal, Execution } from '@/db/types'

/** Espera depois da última tecla antes de gravar valores e observações. */
const ATRASO_PARA_SALVAR_MS = 400

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

/**
 * Texto editado localmente (sem esperar o banco a cada tecla) e gravado com atraso.
 * `salvarAgora` grava o que estiver pendente, para usar antes de concluir.
 */
export function useCampoComAtraso<T>(
  execucao: Execution,
  ler: (execucao: Execution) => T,
  paraMudanca: (valor: T) => MudancasExecucao,
) {
  const [valor, setValor] = useState(() => ler(execucao))
  const pendenteRef = useRef<T | null>(null)

  useEffect(() => {
    if (pendenteRef.current === null) return
    const temporizador = window.setTimeout(() => {
      if (pendenteRef.current === null) return
      void atualizarExecucao(execucao.id, paraMudanca(pendenteRef.current))
      pendenteRef.current = null
    }, ATRASO_PARA_SALVAR_MS)
    return () => window.clearTimeout(temporizador)
  }, [valor, execucao.id, paraMudanca])

  function mudar(novo: T) {
    pendenteRef.current = novo
    setValor(novo)
  }

  async function salvarAgora() {
    if (pendenteRef.current === null) return
    const pendente = pendenteRef.current
    pendenteRef.current = null
    await atualizarExecucao(execucao.id, paraMudanca(pendente))
  }

  return { valor, mudar, salvarAgora }
}
