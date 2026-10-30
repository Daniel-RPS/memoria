import { db } from '@/db/database'
import type { Procedure, ProcedureVersion } from '@/db/types'
import { excluirAnexosDe } from '@/db/repositories/attachment-repository'
import { excluirNotasDe } from '@/db/repositories/note-repository'
import { agora } from '@/db/repositories/ordenacao'
import { idsDosPassos } from '@/lib/procedimentos'

/** O que o editor salva; id, versão e datas são do repositório. */
export type DadosProcedimento = Pick<
  Procedure,
  'titulo' | 'categoryId' | 'descricao' | 'secoes' | 'camposVariaveis'
>

export function listarProcedimentos() {
  return db.procedures.toArray()
}

export function obterProcedimento(id: string) {
  return db.procedures.get(id)
}

export async function criarProcedimento(dados: DadosProcedimento): Promise<Procedure> {
  const momento = agora()
  const procedimento: Procedure = {
    ...dados,
    titulo: dados.titulo.trim(),
    id: crypto.randomUUID(),
    versao: 1,
    criadoEm: momento,
    atualizadoEm: momento,
  }
  await db.procedures.add(procedimento)
  return procedimento
}

/**
 * Salva a edição. IMPORTANTE: antes, guarda o procedimento atual como versão anterior;
 * a versão nova é a seguinte. Devolve o número da versão nova.
 */
export async function salvarProcedimento(id: string, dados: DadosProcedimento) {
  return db.transaction('rw', db.procedures, db.procedureVersions, async () => {
    const atual = await db.procedures.get(id)
    if (!atual) throw new Error('Procedimento não encontrado.')
    const momento = agora()
    const anterior: ProcedureVersion = {
      id: crypto.randomUUID(),
      procedureId: id,
      versao: atual.versao,
      snapshot: atual,
      alteradoEm: momento,
    }
    await db.procedureVersions.add(anterior)
    const versao = atual.versao + 1
    await db.procedures.put({
      ...atual,
      ...dados,
      titulo: dados.titulo.trim(),
      versao,
      atualizadoEm: momento,
    })
    return versao
  })
}

/** Versões anteriores, da mais recente para a mais antiga. */
export async function listarVersoes(procedureId: string) {
  const versoes = await db.procedureVersions.where('procedureId').equals(procedureId).toArray()
  return versoes.sort((a, b) => b.versao - a.versao)
}

/** O procedimento como estava na `versao` pedida (a atual ou uma guardada). */
export async function obterVersao(procedureId: string, versao: number) {
  const atual = await db.procedures.get(procedureId)
  if (atual?.versao === versao) return atual
  const guardada = await db.procedureVersions
    .where('[procedureId+versao]')
    .equals([procedureId, versao])
    .first()
  return guardada?.snapshot
}

/** Volta ao conteúdo de uma versão antiga. Como toda edição, a atual vira versão anterior. */
export async function restaurarVersao(procedureId: string, versao: number) {
  const antiga = await obterVersao(procedureId, versao)
  if (!antiga) throw new Error('Versão não encontrada.')
  const { titulo, categoryId, descricao, secoes, camposVariaveis } = antiga
  return salvarProcedimento(procedureId, { titulo, categoryId, descricao, secoes, camposVariaveis })
}

/**
 * Exclui o procedimento com versões, histórico de execuções, anotação e anexos
 * (inclusive os dos passos de todas as versões).
 * Tarefas agendadas continuam no calendário, só perdem o vínculo.
 */
export async function excluirProcedimento(id: string) {
  await db.transaction(
    'rw',
    [db.procedures, db.procedureVersions, db.executions, db.tasks, db.notes, db.attachments],
    async () => {
      const atual = await db.procedures.get(id)
      const versoes = await db.procedureVersions.where('procedureId').equals(id).toArray()
      const passos = new Set(
        [atual, ...versoes.map((versao) => versao.snapshot)].flatMap((procedimento) =>
          procedimento ? idsDosPassos(procedimento) : [],
        ),
      )
      await excluirAnexosDe([
        { tipo: 'procedure', id },
        ...[...passos].map((passoId) => ({ tipo: 'step' as const, id: passoId })),
      ])
      await excluirNotasDe([{ tipo: 'procedure', id }])
      await db.tasks
        .where('procedureId')
        .equals(id)
        .modify({ procedureId: undefined, atualizadoEm: agora() })
      await db.executions.where('procedureId').equals(id).delete()
      await db.procedureVersions.where('procedureId').equals(id).delete()
      await db.procedures.delete(id)
    },
  )
}
