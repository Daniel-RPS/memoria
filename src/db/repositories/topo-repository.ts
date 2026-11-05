import { db } from '@/db/database'
import { agora } from '@/db/repositories/ordenacao'
import { reordenarItem } from '@/db/repositories/group-repository'
import { reordenarTarefa } from '@/db/repositories/task-repository'
import { chaveDoTopo, type Gravacao } from '@/domain/ordem-de-exibicao'

/**
 * Grava a posição arrastada de cada membro de um bloco do topo (prioridade e/ou em andamento),
 * 1, 2, 3… na ordem recebida. A `ordem` salva não muda: ao sair do bloco, o registro volta ao
 * lugar de antes. Os ids são de tarefas soltas OU de itens de um mesmo card.
 */
export async function reordenarNoTopo(idsEmOrdem: string[]) {
  await db.transaction('rw', [db.tasks, db.groupItems], async () => {
    const momento = agora()
    for (const [indice, id] of idsEmOrdem.entries()) {
      const registro = (await db.tasks.get(id)) ?? (await db.groupItems.get(id))
      if (!registro) continue
      const mudancas = {
        ordemNoTopo: { chave: chaveDoTopo(registro), posicao: indice + 1 },
        atualizadoEm: momento,
      }
      if (await db.tasks.get(id)) await db.tasks.update(id, mudancas)
      else await db.groupItems.update(id, mudancas)
    }
  })
}

/**
 * Grava o resultado de arrastar `idMovido` dentro de uma lista (ver `planejarGravacao`): a
 * posição do bloco do topo, ou a `ordem` entre vizinhos. `escala` diz onde está a `ordem`: no dia
 * (tarefas soltas e cards) ou no card (itens).
 */
export async function gravarReordenacao(
  gravacao: Gravacao,
  idMovido: string,
  escala: 'dia' | 'card',
) {
  if (gravacao.tipo === 'topo') return reordenarNoTopo(gravacao.ids)
  return escala === 'dia'
    ? reordenarTarefa(gravacao.ids, idMovido)
    : reordenarItem(gravacao.ids, idMovido)
}
