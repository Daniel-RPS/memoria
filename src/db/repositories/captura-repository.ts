import { db } from '@/db/database'
import type { DataLocal } from '@/db/types'
import { adicionarAnexo } from '@/db/repositories/attachment-repository'
import {
  criarGrupo,
  criarItem,
  excluirGrupo,
  excluirItem,
  arquivarGrupo,
} from '@/db/repositories/group-repository'
import { criarTarefa, excluirTarefa } from '@/db/repositories/task-repository'
import { itensPreenchidos, type TipoCaptura } from '@/lib/captura'

/** Anexo escolhido na captura, gravado junto com a tarefa (foto já reduzida). */
export type AnexoDaCaptura =
  { tipo: 'foto'; nome: string; blob: Blob } | { tipo: 'link'; nome: string; url: string }

export interface NovaCaptura {
  tipo: TipoCaptura
  titulo: string
  data: DataLocal
  categoryId?: string
  subcategoryId?: string
  /** Só do grupo. */
  itens?: { titulo: string }[]
  /** Só da tarefa. */
  anexos?: AnexoDaCaptura[]
}

export interface ResultadoCaptura {
  tipo: TipoCaptura
  /** Id da tarefa ou do card. */
  id: string
  data: DataLocal
  /** Itens criados agora (grupo). */
  idsItens: string[]
  /** Card que já existia arquivado e foi reaberto: desfazer só tira o que entrou agora. */
  isCardReaberto: boolean
}

/**
 * Cria pela captura rápida: tarefa solta (com anexos) ou card de grupo com os itens, numa
 * transação. Grupo com nome de série existente reusa a série (regra de `criarGrupo`).
 */
export async function capturar(dados: NovaCaptura): Promise<ResultadoCaptura> {
  const categoria = { categoryId: dados.categoryId, subcategoryId: dados.subcategoryId }
  if (dados.tipo === 'tarefa') {
    return db.transaction('rw', db.tasks, db.groupCards, db.attachments, async () => {
      const tarefa = await criarTarefa({ titulo: dados.titulo, data: dados.data, ...categoria })
      for (const anexo of dados.anexos ?? []) {
        await adicionarAnexo({ dono: { tipo: 'task', id: tarefa.id }, ...anexo })
      }
      return {
        tipo: 'tarefa',
        id: tarefa.id,
        data: tarefa.data,
        idsItens: [],
        isCardReaberto: false,
      }
    })
  }
  return db.transaction(
    'rw',
    [db.tasks, db.groupSeries, db.groupCards, db.groupItems],
    async () => {
      const card = await criarGrupo({ titulo: dados.titulo, data: dados.data, ...categoria })
      const idsItens: string[] = []
      for (const titulo of itensPreenchidos(dados.itens ?? [])) {
        idsItens.push((await criarItem(card.id, titulo)).id)
      }
      return {
        tipo: 'grupo',
        id: card.id,
        data: card.data,
        idsItens,
        isCardReaberto: card.criadoEm !== card.atualizadoEm,
      }
    },
  )
}

/** Desfaz a captura: apaga a tarefa (e anexos) ou o card novo; card reaberto volta a arquivado. */
export async function desfazerCaptura(resultado: ResultadoCaptura) {
  if (resultado.tipo === 'tarefa') return excluirTarefa(resultado.id)
  if (!resultado.isCardReaberto) return excluirGrupo(resultado.id)
  await db.transaction('rw', db.groupCards, db.groupItems, async () => {
    for (const id of resultado.idsItens) await excluirItem(id)
    await arquivarGrupo(resultado.id)
  })
}
