import { db } from '@/db/database'
import type { GroupItem, Subtask, Task, TimeSession } from '@/db/types'
import { agora, gravarNovaPosicao } from '@/db/repositories/ordenacao'
import { fecharSessoesAbertasDe, restaurarSessoes } from '@/domain/tempo'
import { efeitoNoDono, proximaOrdemDeSubetapa } from '@/domain/subetapas'
import { SEM_PRIORIDADE } from '@/domain/prioridade'
import { SEM_ANDAMENTO } from '@/lib/andamento'

/**
 * Subetapas (tabela `subtasks`) de tarefas soltas E de itens de grupo: `taskId` é o id do dono,
 * seja tarefa ou item (ver `Subtask`).
 */

/** Subetapas de vários donos de uma vez (uma consulta para o dia inteiro). */
export function listarSubtarefas(donoIds: string[]) {
  return db.subtasks.where('taskId').anyOf(donoIds).toArray()
}

/**
 * Cria uma subetapa. `concluida` já nasce marcada (importação) SEM a conclusão automática do
 * dono: quem importa "- [ ] Ligar" com uma subetapa feita quer a tarefa pendente.
 */
export async function criarSubtarefa(dados: {
  taskId: string
  titulo: string
  concluida?: boolean
}): Promise<Subtask> {
  const [criada] = await criarSubtarefas(dados.taskId, [dados.titulo], dados.concluida)
  return criada
}

/** Várias subetapas de uma vez, no fim da lista do dono, na ordem recebida (texto colado). */
export async function criarSubtarefas(
  donoId: string,
  titulos: string[],
  concluida = false,
): Promise<Subtask[]> {
  return db.transaction('rw', db.subtasks, async () => {
    const irmas = await db.subtasks.where('taskId').equals(donoId).toArray()
    const primeiraOrdem = proximaOrdemDeSubetapa(irmas)
    const momento = agora()
    const criadas = titulos.map((titulo, indice): Subtask => ({
      id: crypto.randomUUID(),
      taskId: donoId,
      titulo: titulo.trim(),
      concluida,
      ordem: primeiraOrdem + indice,
      criadoEm: momento,
      atualizadoEm: momento,
    }))
    await db.subtasks.bulkAdd(criadas)
    return criadas
  })
}

export async function renomearSubtarefa(id: string, titulo: string) {
  await db.subtasks.update(id, { titulo: titulo.trim(), atualizadoEm: agora() })
}

export async function excluirSubtarefa(id: string) {
  await db.subtasks.delete(id)
}

/** Grava a nova posição de `idMovido` entre as subetapas do dono (`idsEmOrdem` já reordenado). */
export async function reordenarSubtarefa(idsEmOrdem: string[], idMovido: string) {
  await db.transaction('rw', db.subtasks, () =>
    gravarNovaPosicao(db.subtasks, idsEmOrdem, idMovido),
  )
}

/** O que a conclusão automática fez com o dono (e como voltar atrás). */
export interface ResultadoDaSubetapa {
  /** `concluiu`: a última subetapa concluiu o dono; `reabriu`: desmarcar o reabriu. */
  efeito: 'concluiu' | 'reabriu' | null
  /** Devolve a subetapa e o dono ao que eram antes. */
  desfazer: () => Promise<void>
}

type Dono = { tipo: 'tarefa'; registro: Task } | { tipo: 'item'; registro: GroupItem }

async function lerDono(id: string): Promise<Dono | undefined> {
  const tarefa = await db.tasks.get(id)
  if (tarefa) return { tipo: 'tarefa', registro: tarefa }
  const item = await db.groupItems.get(id)
  return item ? { tipo: 'item', registro: item } : undefined
}

function estadoDoDono(dono: Dono) {
  const { registro } = dono
  const isTarefa = dono.tipo === 'tarefa'
  return {
    isPendente: registro.status === 'pendente',
    isConcluido: registro.status === (isTarefa ? 'concluida' : 'concluido'),
    concluidaPelasSubetapas: registro.concluidaPelasSubetapas === true,
  }
}

/**
 * Marca ou desmarca a subetapa. Marcar a ÚLTIMA pendente conclui o dono (tarefa ou item) como
 * se ele fosse marcado: riscado, perde o "em andamento" e para o tempo em curso. Desmarcar uma
 * subetapa de um dono concluído assim o reabre. Tudo numa transação.
 */
export async function definirConclusaoSubtarefa(
  id: string,
  concluida: boolean,
): Promise<ResultadoDaSubetapa> {
  const nada: ResultadoDaSubetapa = { efeito: null, desfazer: async () => {} }
  return db.transaction(
    'rw',
    [db.subtasks, db.tasks, db.groupItems, db.sessions],
    async (): Promise<ResultadoDaSubetapa> => {
      const subetapa = await db.subtasks.get(id)
      if (!subetapa || subetapa.concluida === concluida) return nada
      const dono = await lerDono(subetapa.taskId)
      const momento = agora()
      await db.subtasks.update(id, { concluida, atualizadoEm: momento })
      if (!dono) return nada
      const irmas = await db.subtasks.where('taskId').equals(subetapa.taskId).toArray()
      const efeito = efeitoNoDono(concluida, irmas, estadoDoDono(dono))
      const anterior = { subetapa, dono }
      let sessoesFechadas: TimeSession[] = []

      if (efeito === 'concluir') {
        if (dono.tipo === 'tarefa') {
          await db.tasks.update(dono.registro.id, {
            status: 'concluida',
            concluidaEm: momento,
            concluidaPelasSubetapas: true,
            atualizadoEm: momento,
            ...SEM_ANDAMENTO,
            ...SEM_PRIORIDADE,
          })
          sessoesFechadas = await fecharSessoesAbertasDe({ tarefas: [dono.registro.id] }, momento)
        } else {
          await db.groupItems.update(dono.registro.id, {
            status: 'concluido',
            concluidoEm: momento,
            concluidaPelasSubetapas: true,
            atualizadoEm: momento,
            ...SEM_ANDAMENTO,
            ...SEM_PRIORIDADE,
          })
          sessoesFechadas = await fecharSessoesAbertasDe(
            { itens: [dono.registro.id], cadeias: [dono.registro.cadeiaId] },
            momento,
          )
        }
      } else if (efeito === 'reabrir') {
        const campos = { concluidaPelasSubetapas: undefined, atualizadoEm: momento }
        if (dono.tipo === 'tarefa') {
          await db.tasks.update(dono.registro.id, {
            ...campos,
            status: 'pendente',
            concluidaEm: undefined,
          })
        } else {
          await db.groupItems.update(dono.registro.id, {
            ...campos,
            status: 'pendente',
            concluidoEm: undefined,
          })
        }
      }

      return {
        efeito: efeito === 'concluir' ? 'concluiu' : efeito === 'reabrir' ? 'reabriu' : null,
        desfazer: () =>
          db.transaction('rw', [db.subtasks, db.tasks, db.groupItems, db.sessions], async () => {
            await db.subtasks.put(anterior.subetapa)
            if (anterior.dono.tipo === 'tarefa') await db.tasks.put(anterior.dono.registro)
            else await db.groupItems.put(anterior.dono.registro)
            await restaurarSessoes({ fechadas: sessoesFechadas })
          }),
      }
    },
  )
}
