import { db } from '@/db/database'
import type { GroupItem, Task } from '@/db/types'
import { agora } from '@/db/repositories/ordenacao'
import {
  camposDePrioridade,
  deveMarcarPrioridade,
  isPrioritario,
  podeTerPrioridade,
  SEM_PRIORIDADE,
  type CamposDePrioridade,
} from '@/domain/prioridade'

/** Tarefas soltas e itens de grupo a marcar (ou tirar) como prioridade. */
export interface AlvosDePrioridade {
  tarefas?: string[]
  itens?: string[]
}

/** A marca que cada registro tinha antes: é o que o "Desfazer" devolve. */
export interface PrioridadeAnterior {
  tarefas: ({ id: string } & CamposDePrioridade)[]
  itens: ({ id: string } & CamposDePrioridade)[]
}

function existentes<T>(lista: (T | undefined)[]) {
  return lista.filter((registro): registro is T => registro !== undefined)
}

function anterior({ id, prioridade, prioridadeDesde }: Task | GroupItem) {
  return { id, prioridade, prioridadeDesde }
}

/**
 * Marca como prioridade (só o que está pendente) ou tira a marca. Quem já estava como pedido
 * não muda nem entra no resultado. Devolve a marca de antes dos que mudaram.
 */
export async function definirPrioridade(
  alvos: AlvosDePrioridade,
  isMarcar: boolean,
): Promise<PrioridadeAnterior> {
  return db.transaction('rw', [db.tasks, db.groupItems], async () => {
    const [tarefas, itens] = await Promise.all([
      db.tasks.bulkGet(alvos.tarefas ?? []),
      db.groupItems.bulkGet(alvos.itens ?? []),
    ])
    const momento = agora()
    const campos = isMarcar ? camposDePrioridade(momento) : SEM_PRIORIDADE
    const muda = (registro: Task | GroupItem) =>
      isMarcar ? podeTerPrioridade(registro) && !isPrioritario(registro) : isPrioritario(registro)
    const tarefasMudadas = existentes(tarefas).filter(muda)
    const itensMudados = existentes(itens).filter(muda)
    await Promise.all([
      ...tarefasMudadas.map((tarefa) =>
        db.tasks.update(tarefa.id, { ...campos, atualizadoEm: momento }),
      ),
      ...itensMudados.map((item) =>
        db.groupItems.update(item.id, { ...campos, atualizadoEm: momento }),
      ),
    ])
    return { tarefas: tarefasMudadas.map(anterior), itens: itensMudados.map(anterior) }
  })
}

/**
 * Alterna a prioridade de vários de uma vez (tecla P): marca todos se algum ainda não tem,
 * senão tira de todos. Devolve se marcou e a marca de antes dos que mudaram.
 */
export async function alternarPrioridade(alvos: AlvosDePrioridade) {
  return db.transaction('rw', [db.tasks, db.groupItems], async () => {
    const [tarefas, itens] = await Promise.all([
      db.tasks.bulkGet(alvos.tarefas ?? []),
      db.groupItems.bulkGet(alvos.itens ?? []),
    ])
    const isMarcar = deveMarcarPrioridade([...existentes(tarefas), ...existentes(itens)])
    return { isMarcar, anteriores: await definirPrioridade(alvos, isMarcar) }
  })
}

/** Devolve a cada registro a marca que tinha (o "Desfazer" de marcar e de tirar). */
export async function restaurarPrioridade(anteriores: PrioridadeAnterior) {
  const momento = agora()
  await db.transaction('rw', [db.tasks, db.groupItems], async () => {
    await Promise.all([
      ...anteriores.tarefas.map(({ id, ...marca }) =>
        db.tasks.update(id, { ...marca, atualizadoEm: momento }),
      ),
      ...anteriores.itens.map(({ id, ...marca }) =>
        db.groupItems.update(id, { ...marca, atualizadoEm: momento }),
      ),
    ])
  })
}

/** Quantos registros o resultado alterou. */
export function quantidadeAlteradaPrioridade(resultado: PrioridadeAnterior) {
  return resultado.tarefas.length + resultado.itens.length
}
