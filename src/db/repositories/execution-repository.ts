import { db } from '@/db/database'
import type { DataLocal, Execution } from '@/db/types'
import { agora } from '@/db/repositories/ordenacao'
import { definirEstadoDoPasso } from '@/lib/procedimentos'

/*
 * IMPORTANTE: o modo execução NUNCA altera o procedimento. Nenhuma função daqui escreve em
 * `db.procedures` ou `db.procedureVersions` — só em `db.executions` (e na tarefa ligada).
 */

export type MudancasExecucao = Partial<
  Pick<Execution, 'valoresCampos' | 'passosMarcados' | 'passosPulados' | 'observacoes'>
>

/** Execução em andamento do procedimento (para a mesma tarefa, se houver), se existir. */
export function obterExecucaoEmAndamento(procedureId: string, taskId?: string) {
  return db.executions
    .where('procedureId')
    .equals(procedureId)
    .filter((execucao) => !execucao.concluidaEm && execucao.taskId === taskId)
    .first()
}

/** Retoma a execução em andamento ou começa uma nova na versão atual do procedimento. */
export async function iniciarOuRetomarExecucao(dados: {
  procedureId: string
  hoje: DataLocal
  taskId?: string
}): Promise<Execution> {
  return db.transaction('rw', db.executions, db.procedures, async () => {
    const emAndamento = await obterExecucaoEmAndamento(dados.procedureId, dados.taskId)
    if (emAndamento) return emAndamento
    const procedimento = await db.procedures.get(dados.procedureId)
    if (!procedimento) throw new Error('Procedimento não encontrado.')
    const momento = agora()
    const execucao: Execution = {
      id: crypto.randomUUID(),
      procedureId: dados.procedureId,
      versao: procedimento.versao,
      data: dados.hoje,
      valoresCampos: {},
      passosMarcados: [],
      passosPulados: [],
      observacoes: '',
      taskId: dados.taskId,
      criadoEm: momento,
      atualizadoEm: momento,
    }
    await db.executions.add(execucao)
    return execucao
  })
}

export async function atualizarExecucao(id: string, mudancas: MudancasExecucao) {
  await db.executions.update(id, { ...mudancas, atualizadoEm: agora() })
}

/**
 * Marca, pula ou volta um passo a pendente lendo o estado atual dentro da transação,
 * para cliques rápidos em passos diferentes não apagarem um ao outro.
 */
export async function mudarEstadoDoPasso(
  id: string,
  passoId: string,
  estado: 'feito' | 'pulado' | 'pendente',
) {
  await db.transaction('rw', db.executions, async () => {
    const execucao = await db.executions.get(id)
    if (!execucao) return
    await db.executions.update(id, {
      ...definirEstadoDoPasso(execucao, passoId, estado),
      atualizadoEm: agora(),
    })
  })
}

/** Conclui a execução; se veio de uma tarefa do calendário, conclui a tarefa também. */
export async function concluirExecucao(id: string) {
  await db.transaction('rw', db.executions, db.tasks, async () => {
    const execucao = await db.executions.get(id)
    if (!execucao) return
    const momento = agora()
    await db.executions.update(id, { concluidaEm: momento, atualizadoEm: momento })
    if (execucao.taskId) {
      await db.tasks.update(execucao.taskId, {
        status: 'concluida',
        concluidaEm: momento,
        atualizadoEm: momento,
      })
    }
  })
}

/** Apaga uma execução em andamento (concluídas ficam no histórico). */
export async function descartarExecucao(id: string) {
  const execucao = await db.executions.get(id)
  if (execucao && !execucao.concluidaEm) await db.executions.delete(id)
}

export function obterExecucao(id: string) {
  return db.executions.get(id)
}

/** Execuções do procedimento, da mais recente para a mais antiga. */
export async function listarExecucoes(procedureId: string) {
  const execucoes = await db.executions.where('procedureId').equals(procedureId).toArray()
  return execucoes.sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))
}
