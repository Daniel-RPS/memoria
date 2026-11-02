import { db } from '@/db/database'
import type { Procedure } from '@/db/types'
import { agora } from '@/db/repositories/ordenacao'
import type { DadosProcedimento } from '@/lib/esquema-procedimento'
import { numerarEtapas } from '@/lib/procedimentos'

export function listarProcedimentos() {
  return db.procedures.toArray()
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
    subcategoryId: categoryId ? dados.subcategoryId || undefined : undefined,
    etapas: numerarEtapas(dados.etapas),
  }
}

export async function criarProcedimento(dados: DadosProcedimento): Promise<Procedure> {
  const momento = agora()
  const { categoryId, subcategoryId, icone, ...campos } = camposGravados(dados)
  const procedimento: Procedure = {
    id: crypto.randomUUID(),
    ...campos,
    ...(icone ? { icone } : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(subcategoryId ? { subcategoryId } : {}),
    criadoEm: momento,
    atualizadoEm: momento,
  }
  await db.procedures.add(procedimento)
  return procedimento
}

/** Grava título, categoria, subcategoria e etapas (a lista inteira, na ordem da tela). */
export async function salvarProcedimento(id: string, dados: DadosProcedimento) {
  const atualizados = await db.procedures.update(id, {
    ...camposGravados(dados),
    atualizadoEm: agora(),
  })
  if (atualizados === 0) throw new Error('Procedimento não encontrado.')
}

export async function excluirProcedimento(id: string) {
  await db.procedures.delete(id)
}
