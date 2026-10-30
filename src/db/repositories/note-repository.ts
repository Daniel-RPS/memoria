import { db } from '@/db/database'
import type { Dono, Note } from '@/db/types'
import { excluirAnexosDe } from '@/db/repositories/attachment-repository'
import { agora } from '@/db/repositories/ordenacao'

/** Notas avulsas (sem dono), da mais recente para a mais antiga. */
export async function listarNotas() {
  const notas = await db.notes.filter((nota) => !nota.dono).toArray()
  return notas.sort((a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm))
}

export function obterNota(id: string) {
  return db.notes.get(id)
}

export async function criarNota(dados: { titulo?: string; conteudo?: string } = {}) {
  const momento = agora()
  const nota: Note = {
    id: crypto.randomUUID(),
    titulo: dados.titulo?.trim() ?? '',
    conteudo: dados.conteudo ?? '',
    criadoEm: momento,
    atualizadoEm: momento,
  }
  await db.notes.add(nota)
  return nota
}

export async function atualizarNota(id: string, mudancas: { titulo?: string; conteudo?: string }) {
  await db.notes.update(id, { ...mudancas, atualizadoEm: agora() })
}

/** Exclui a nota e os anexos dela. */
export async function excluirNota(id: string) {
  await db.transaction('rw', db.notes, db.attachments, async () => {
    await excluirAnexosDe([{ tipo: 'note', id }])
    await db.notes.delete(id)
  })
}

/** A anotação ligada a uma tarefa ou procedimento (no máximo uma por dono). */
export function obterNotaDoDono(dono: Dono) {
  return db.notes.where('[dono.tipo+dono.id]').equals([dono.tipo, dono.id]).first()
}

/**
 * Grava a anotação do dono: cria se não existir, atualiza se existir
 * e apaga se o texto ficar vazio (não guarda anotação em branco).
 */
export async function salvarNotaDoDono(dono: Dono, conteudo: string) {
  await db.transaction('rw', db.notes, async () => {
    const existente = await obterNotaDoDono(dono)
    const isVazio = conteudo.trim() === ''
    if (existente && isVazio) {
      await db.notes.delete(existente.id)
      return
    }
    if (existente) {
      await db.notes.update(existente.id, { conteudo, atualizadoEm: agora() })
      return
    }
    if (isVazio) return
    const momento = agora()
    await db.notes.add({
      id: crypto.randomUUID(),
      titulo: '',
      conteudo,
      dono,
      criadoEm: momento,
      atualizadoEm: momento,
    })
  })
}

/** Apaga anotações de vários donos; roda dentro da transação de quem chama. */
export async function excluirNotasDe(donos: Dono[]) {
  if (donos.length === 0) return
  await db.notes
    .where('[dono.tipo+dono.id]')
    .anyOf(donos.map((dono) => [dono.tipo, dono.id]))
    .delete()
}

/** Quais dos donos têm anotação (para mostrar o indicador sem carregar o texto). */
export async function donosComNota(tipo: Dono['tipo'], ids: string[]) {
  const comNota = new Set<string>()
  if (ids.length === 0) return comNota
  await db.notes
    .where('[dono.tipo+dono.id]')
    .anyOf(ids.map((id) => [tipo, id]))
    .each((nota) => {
      if (nota.dono) comNota.add(nota.dono.id)
    })
  return comNota
}
