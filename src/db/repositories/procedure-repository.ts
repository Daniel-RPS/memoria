import { db } from '@/db/database'
import type { Procedure } from '@/db/types'
import { soltarNotasSemAlvo } from '@/db/repositories/note-repository'
import { agora } from '@/db/repositories/ordenacao'
import {
  ordemNoFimDaCategoria,
  planejarMoverProcedimento,
  planejarReordenarProcedimentos,
  type DirecaoDeMover,
} from '@/domain/procedimentos'
import type { DadosProcedimento } from '@/lib/esquema-procedimento'
import { numerarEtapas } from '@/lib/procedimentos'

/** Procedimentos não arquivados. */
export function listarProcedimentos() {
  return db.procedures.filter((procedimento) => !procedimento.arquivado).toArray()
}

export function obterProcedimento(id: string) {
  return db.procedures.get(id)
}

/** O que muda ao gravar: a `ordem` de cada etapa é a posição recebida. */
function camposGravados(dados: DadosProcedimento) {
  const categoryId = dados.categoryId || undefined
  return {
    titulo: dados.titulo.trim(),
    // `undefined` ao salvar = "Sem ícone": o Dexie tira o campo do registro.
    icone: dados.icone,
    categoryId,
    etapas: numerarEtapas(dados.etapas),
  }
}

/** Cria no FIM da categoria. */
export async function criarProcedimento(dados: DadosProcedimento): Promise<Procedure> {
  return db.transaction('rw', db.procedures, async () => {
    const momento = agora()
    const { categoryId, icone, ...campos } = camposGravados(dados)
    const procedimento: Procedure = {
      id: crypto.randomUUID(),
      ...campos,
      ...(icone ? { icone } : {}),
      ...(categoryId ? { categoryId } : {}),
      ordem: ordemNoFimDaCategoria(await listarProcedimentos(), categoryId),
      criadoEm: momento,
      atualizadoEm: momento,
    }
    await db.procedures.add(procedimento)
    return procedimento
  })
}

/**
 * Grava título, categoria e etapas (a lista inteira, na ordem da tela). Trocar a categoria leva
 * o procedimento para o fim da nova.
 */
export async function salvarProcedimento(id: string, dados: DadosProcedimento) {
  await db.transaction('rw', db.procedures, async () => {
    const anterior = await db.procedures.get(id)
    if (!anterior) throw new Error('Procedimento não encontrado.')
    const campos = camposGravados(dados)
    const isOutraCategoria = (anterior.categoryId ?? '') !== (campos.categoryId ?? '')
    await db.procedures.update(id, {
      ...campos,
      ...(isOutraCategoria && {
        ordem: ordemNoFimDaCategoria(await listarProcedimentos(), campos.categoryId, id),
      }),
      atualizadoEm: agora(),
    })
  })
}

/** Sobe ou desce uma posição dentro da categoria; no limite do bloco, não faz nada. */
export async function moverProcedimento(id: string, direcao: DirecaoDeMover) {
  await db.transaction('rw', db.procedures, async () => {
    const mudancas = planejarMoverProcedimento(await listarProcedimentos(), id, direcao) ?? []
    // Só a posição: a data de edição do cartão não muda.
    await Promise.all(mudancas.map(({ id: alvo, ordem }) => db.procedures.update(alvo, { ordem })))
  })
}

/** Grava a posição de `idMovido` depois de arrastar (`idsEmOrdem` = o bloco na ordem nova). */
export async function reordenarProcedimentos(idsEmOrdem: string[], idMovido: string) {
  await db.transaction('rw', db.procedures, async () => {
    const bloco = await db.procedures.bulkGet(idsEmOrdem)
    const existentes = bloco.filter((procedimento) => procedimento !== undefined)
    const mudancas = planejarReordenarProcedimentos(existentes, idsEmOrdem, idMovido) ?? []
    await Promise.all(mudancas.map(({ id, ordem }) => db.procedures.update(id, { ordem })))
  })
}

/** Exclui o procedimento; as notas ligadas a ele ficam avulsas (nunca são apagadas). */
export async function excluirProcedimento(id: string) {
  await db.transaction('rw', db.procedures, db.notes, async () => {
    await db.procedures.delete(id)
    await soltarNotasSemAlvo([{ tipo: 'procedimento', id }])
  })
}
