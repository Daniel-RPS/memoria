import { db } from '@/db/database'
import type { Attachment, Dono, TipoAnexo } from '@/db/types'
import { agora } from '@/db/repositories/ordenacao'

/** Anexos de um dono (tarefa, nota, procedimento ou passo), do mais antigo ao mais novo. */
export async function listarAnexos(dono: Dono) {
  const anexos = await db.attachments
    .where('[dono.tipo+dono.id]')
    .equals([dono.tipo, dono.id])
    .toArray()
  return anexos.sort((a, b) => a.criadoEm.localeCompare(b.criadoEm))
}

/** Quantos anexos cada dono tem (para mostrar o número sem carregar os arquivos). */
export async function contarAnexos(tipo: Dono['tipo'], ids: string[]) {
  const contagem = new Map<string, number>()
  if (ids.length === 0) return contagem
  await db.attachments
    .where('[dono.tipo+dono.id]')
    .anyOf(ids.map((id) => [tipo, id]))
    .each((anexo) => contagem.set(anexo.dono.id, (contagem.get(anexo.dono.id) ?? 0) + 1))
  return contagem
}

export interface NovoAnexo {
  dono: Dono
  tipo: TipoAnexo
  nome: string
  blob?: Blob
  url?: string
}

export async function adicionarAnexo(dados: NovoAnexo): Promise<Attachment> {
  const momento = agora()
  const anexo: Attachment = {
    id: crypto.randomUUID(),
    dono: dados.dono,
    tipo: dados.tipo,
    nome: dados.nome.trim(),
    mime: dados.blob?.type || undefined,
    blob: dados.blob,
    url: dados.url,
    criadoEm: momento,
    atualizadoEm: momento,
  }
  await db.attachments.add(anexo)
  return anexo
}

/** Troca o conteúdo de um desenho editado, mantendo o mesmo anexo. */
export async function substituirConteudo(id: string, blob: Blob) {
  await db.attachments.update(id, { blob, mime: blob.type, atualizadoEm: agora() })
}

/** Exclui e devolve o anexo, para permitir "Desfazer". */
export async function excluirAnexo(id: string) {
  return db.transaction('rw', db.attachments, async () => {
    const anexo = await db.attachments.get(id)
    await db.attachments.delete(id)
    return anexo
  })
}

/** Devolve um anexo excluído (o "Desfazer"). */
export async function restaurarAnexo(anexo: Attachment) {
  await db.attachments.put(anexo)
}

/**
 * Apaga os anexos de vários donos. Usado ao excluir tarefa, nota ou procedimento;
 * deve rodar dentro da transação de quem chama (que inclui `db.attachments`).
 */
export async function excluirAnexosDe(donos: Dono[]) {
  if (donos.length === 0) return
  await db.attachments
    .where('[dono.tipo+dono.id]')
    .anyOf(donos.map((dono) => [dono.tipo, dono.id]))
    .delete()
}
