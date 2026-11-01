import { db } from '@/db/database'
import type { DataLocal } from '@/db/types'
import { adicionarAnexo } from '@/db/repositories/attachment-repository'
import { salvarNotaDoDono } from '@/db/repositories/note-repository'
import {
  adicionarItensNaSerie,
  criarGrupo,
  desfazerItensAdicionados,
  type ItensAdicionados,
} from '@/db/repositories/group-repository'
import { criarTarefa, excluirTarefa } from '@/db/repositories/task-repository'
import { itensPreenchidos, type TipoCaptura } from '@/lib/captura'

/** Anexo escolhido na captura, gravado junto com a tarefa (foto já reduzida). */
export type AnexoDaCaptura =
  { tipo: 'foto'; nome: string; blob: Blob } | { tipo: 'link'; nome: string; url: string }

export interface NovaCaptura {
  tipo: TipoCaptura
  /** Título da tarefa ou do grupo novo; em "Em grupo…", o primeiro item. */
  titulo: string
  data: DataLocal
  categoryId?: string
  subcategoryId?: string
  /** Série escolhida em "Em grupo…". */
  seriesId?: string
  /** Itens do grupo novo ou itens a mais em "Em grupo…". */
  itens?: { titulo: string }[]
  /** Só da tarefa. */
  anexos?: AnexoDaCaptura[]
  /** Só da tarefa: vira a anotação dela (as linhas depois do título). */
  anotacao?: string
}

export type ResultadoCaptura =
  | { tipo: 'tarefa'; id: string; data: DataLocal }
  | ({ tipo: 'grupo' | 'em-grupo' } & ItensAdicionados)

/**
 * Cria pela captura rápida, numa transação: tarefa solta (com anexos e anotação), grupo novo com itens
 * (nome de série existente reusa a série, regra de `criarGrupo`) ou itens num grupo que já
 * existe (`adicionarItensNaSerie`).
 */
export async function capturar(dados: NovaCaptura): Promise<ResultadoCaptura> {
  const categoria = { categoryId: dados.categoryId, subcategoryId: dados.subcategoryId }
  const itens = itensPreenchidos(dados.itens ?? [])
  if (dados.tipo === 'tarefa') {
    return db.transaction('rw', [db.tasks, db.groupCards, db.attachments, db.notes], async () => {
      const tarefa = await criarTarefa({ titulo: dados.titulo, data: dados.data, ...categoria })
      const dono = { tipo: 'task' as const, id: tarefa.id }
      for (const anexo of dados.anexos ?? []) {
        await adicionarAnexo({ dono, ...anexo })
      }
      if (dados.anotacao) await salvarNotaDoDono(dono, dados.anotacao)
      return { tipo: 'tarefa', id: tarefa.id, data: tarefa.data }
    })
  }
  if (dados.tipo === 'em-grupo') {
    if (!dados.seriesId) throw new Error('Escolha o grupo.')
    const adicionados = await adicionarItensNaSerie(dados.seriesId, dados.data, [
      dados.titulo,
      ...itens,
    ])
    return { tipo: 'em-grupo', ...adicionados }
  }
  return db.transaction(
    'rw',
    [db.tasks, db.groupSeries, db.groupCards, db.groupItems],
    async () => {
      const card = await criarGrupo({ titulo: dados.titulo, data: dados.data, ...categoria })
      const isReaberto = card.criadoEm !== card.atualizadoEm
      if (itens.length === 0) {
        return {
          tipo: 'grupo',
          cardId: card.id,
          seriesId: card.seriesId,
          data: card.data,
          idsItens: [],
          card: isReaberto ? 'reaberto' : 'criado',
        }
      }
      const adicionados = await adicionarItensNaSerie(card.seriesId, card.data, itens)
      return { ...adicionados, tipo: 'grupo', card: isReaberto ? 'reaberto' : 'criado' }
    },
  )
}

/**
 * Desfaz a captura: apaga a tarefa (com anexos e anotação) ou os itens; card criado agora some, card
 * reaberto volta a arquivado e card que já existia fica.
 */
export async function desfazerCaptura(resultado: ResultadoCaptura) {
  if (resultado.tipo === 'tarefa') return excluirTarefa(resultado.id)
  await desfazerItensAdicionados(resultado)
}
