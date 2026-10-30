import { db } from '@/db/database'
import type { DataLocal, GroupInstance, GroupSeries, Task } from '@/db/types'
import { excluirAnexosDe } from '@/db/repositories/attachment-repository'
import { excluirNotasDe } from '@/db/repositories/note-repository'
import { agora, gravarNovaPosicao } from '@/db/repositories/ordenacao'
import {
  adiarTarefas,
  guardarEstadoDoGrupo,
  juntarResultados,
  limparGrupoEsvaziado,
  maiorOrdemDoDia,
  maiorOrdemDoGrupo,
  moverTarefas,
  resultadoVazio,
  tabelaDoDia,
  type ResultadoMovimento,
} from '@/db/repositories/task-repository'
import { ErroDeValidacao } from '@/lib/erros'
import { mesmoTituloDeSerie, podeMoverGrupo, separarItens } from '@/lib/grupos'
import { destinoDoAdiamento } from '@/lib/mover'

/** Cards visíveis (não arquivados) de `inicio` a `fim` e as séries deles. */
export async function listarGruposEntre(inicio: DataLocal, fim: DataLocal) {
  const instancias = await db.groupInstances
    .where('data')
    .between(inicio, fim, true, true)
    .filter((instancia) => !instancia.arquivado)
    .toArray()
  const idsSeries = [...new Set(instancias.map((instancia) => instancia.seriesId))]
  const series = (await db.groupSeries.bulkGet(idsSeries)).filter(
    (serie): serie is GroupSeries => serie !== undefined,
  )
  return { instancias, series }
}

async function serieComTitulo(titulo: string) {
  const series = await db.groupSeries.toArray()
  return series.find((serie) => mesmoTituloDeSerie(serie.titulo, titulo))
}

export interface NovoGrupo {
  titulo: string
  data: DataLocal
  categoryId?: string
  subcategoryId?: string
}

/**
 * Cria o card no fim do dia. Nome de série que já existe reusa a série (e a categoria dela);
 * se ela já tem card neste dia, lança `ErroDeValidacao`.
 */
export async function criarGrupo(dados: NovoGrupo): Promise<GroupInstance> {
  return db.transaction('rw', db.tasks, db.groupSeries, db.groupInstances, async () => {
    const momento = agora()
    let serie = await serieComTitulo(dados.titulo)
    if (!serie) {
      serie = {
        id: crypto.randomUUID(),
        titulo: dados.titulo.trim(),
        categoryId: dados.categoryId,
        subcategoryId: dados.categoryId ? dados.subcategoryId : undefined,
        criadoEm: momento,
        atualizadoEm: momento,
      }
      await db.groupSeries.add(serie)
    }
    const ordem = (await maiorOrdemDoDia(dados.data)) + 1
    const existente = await db.groupInstances
      .where('[seriesId+data]')
      .equals([serie.id, dados.data])
      .first()
    if (existente && !existente.arquivado) {
      throw new ErroDeValidacao(`Já existe o grupo “${serie.titulo}” neste dia.`)
    }
    if (existente) {
      const reaberto = { ...existente, arquivado: false, ordem, atualizadoEm: momento }
      await db.groupInstances.put(reaberto)
      return reaberto
    }
    const instancia: GroupInstance = {
      id: crypto.randomUUID(),
      seriesId: serie.id,
      data: dados.data,
      ordem,
      arquivado: false,
      criadoEm: momento,
      atualizadoEm: momento,
    }
    await db.groupInstances.add(instancia)
    return instancia
  })
}

/** Novo item pendente no fim do card; nasce no dia do card, com a categoria da série. */
export async function criarItem(instanciaId: string, titulo: string): Promise<Task> {
  return db.transaction('rw', db.tasks, db.groupSeries, db.groupInstances, async () => {
    const instancia = await db.groupInstances.get(instanciaId)
    if (!instancia) throw new Error('Grupo não encontrado.')
    const serie = await db.groupSeries.get(instancia.seriesId)
    const momento = agora()
    const item: Task = {
      id: crypto.randomUUID(),
      titulo: titulo.trim(),
      data: instancia.data,
      dataOriginal: instancia.data,
      categoryId: serie?.categoryId,
      subcategoryId: serie?.subcategoryId,
      groupInstanceId: instancia.id,
      ordem: (await maiorOrdemDoGrupo(instancia.id)) + 1,
      status: 'pendente',
      criadoEm: momento,
      atualizadoEm: momento,
    }
    await db.tasks.add(item)
    return item
  })
}

/** Renomeia a série: vale para o card em todos os dias. Nome de outra série é recusado. */
export async function renomearGrupo(seriesId: string, titulo: string) {
  await db.transaction('rw', db.groupSeries, async () => {
    const outra = await serieComTitulo(titulo)
    if (outra && outra.id !== seriesId) {
      throw new ErroDeValidacao('Já existe um grupo com esse nome.')
    }
    await db.groupSeries.update(seriesId, { titulo: titulo.trim(), atualizadoEm: agora() })
  })
}

/** Ids dos itens de todos os cards da série. */
async function idsDosItensDaSerie(seriesId: string) {
  const instancias = await db.groupInstances.where('seriesId').equals(seriesId).primaryKeys()
  return db.tasks.where('groupInstanceId').anyOf(instancias).primaryKeys()
}

/** Categoria da série (todos os dias); os itens recebem a mesma, para filtro e cores. */
export async function definirCategoriaDoGrupo(
  seriesId: string,
  categoria: { categoryId?: string; subcategoryId?: string },
) {
  const mudancas = {
    categoryId: categoria.categoryId,
    subcategoryId: categoria.categoryId ? categoria.subcategoryId : undefined,
    atualizadoEm: agora(),
  }
  await db.transaction('rw', db.tasks, db.groupSeries, db.groupInstances, async () => {
    await db.groupSeries.update(seriesId, mudancas)
    const ids = await idsDosItensDaSerie(seriesId)
    await db.tasks.where('id').anyOf(ids).modify(mudancas)
  })
}

/**
 * Coloca a tarefa solta (do mesmo dia) dentro do card, na posição em que ela aparece em
 * `idsEmOrdem` (itens do card já com ela) ou no fim. Ela passa a usar a categoria do grupo.
 */
export async function colocarNoGrupo(tarefaId: string, instanciaId: string, idsEmOrdem?: string[]) {
  await db.transaction('rw', db.tasks, db.groupSeries, db.groupInstances, async () => {
    const instancia = await db.groupInstances.get(instanciaId)
    if (!instancia) return
    const serie = await db.groupSeries.get(instancia.seriesId)
    await db.tasks.update(tarefaId, {
      groupInstanceId: instancia.id,
      data: instancia.data,
      categoryId: serie?.categoryId,
      subcategoryId: serie?.subcategoryId,
      ordem: (await maiorOrdemDoGrupo(instancia.id)) + 1,
      atualizadoEm: agora(),
    })
    if (idsEmOrdem) await gravarNovaPosicao(db.tasks, idsEmOrdem, tarefaId)
  })
}

/**
 * Tira o item do card: vira tarefa solta no mesmo dia (com a categoria que tinha), na posição
 * de `idsEmOrdemNoDia` (tarefas soltas e cards, já com ela) ou no fim do dia.
 */
export async function tirarDoGrupo(tarefaId: string, idsEmOrdemNoDia?: string[]) {
  await db.transaction('rw', db.tasks, db.groupInstances, async () => {
    const tarefa = await db.tasks.get(tarefaId)
    if (!tarefa?.groupInstanceId) return
    await db.tasks.update(tarefaId, {
      groupInstanceId: undefined,
      ordem: (await maiorOrdemDoDia(tarefa.data)) + 1,
      atualizadoEm: agora(),
    })
    if (idsEmOrdemNoDia) await gravarNovaPosicao(tabelaDoDia, idsEmOrdemNoDia, tarefaId)
  })
}

async function itensVisiveis(instanciaId: string) {
  const itens = await db.tasks.where('groupInstanceId').equals(instanciaId).toArray()
  return separarItens(itens)
}

/**
 * Move cards para `destino`: só os itens pendentes vão (para o card da série no destino).
 * Card sem concluídos vai inteiro; card todo concluído fica (não pode ser movido).
 */
export async function moverGrupos(
  instanciaIds: string[],
  destino: DataLocal,
): Promise<ResultadoMovimento> {
  return db.transaction('rw', db.tasks, db.groupInstances, async () => {
    const parciais: ResultadoMovimento[] = []
    for (const id of instanciaIds) {
      const instancia = await db.groupInstances.get(id)
      if (!instancia || instancia.arquivado || instancia.data === destino) continue
      const itens = await itensVisiveis(id)
      if (!podeMoverGrupo(itens)) continue
      if (itens.pendentes.length > 0) {
        parciais.push(
          await moverTarefas(
            itens.pendentes.map((item) => item.id),
            destino,
          ),
        )
        continue
      }
      parciais.push(await moverGrupoVazio(instancia, destino))
    }
    return juntarResultados(...parciais)
  })
}

/** Card sem itens visíveis: muda de dia, ou some se o destino já tem a série. */
async function moverGrupoVazio(instancia: GroupInstance, destino: DataLocal) {
  const resultado = resultadoVazio()
  const existente = await db.groupInstances
    .where('[seriesId+data]')
    .equals([instancia.seriesId, destino])
    .first()
  if (existente) {
    // O destino já tem a série: o card vazio se junta a ele.
    if (existente.arquivado) {
      guardarEstadoDoGrupo(resultado, existente)
      await db.groupInstances.update(existente.id, { arquivado: false, atualizadoEm: agora() })
    }
    await limparGrupoEsvaziado(instancia.id, resultado)
  } else {
    guardarEstadoDoGrupo(resultado, instancia)
    await db.groupInstances.update(instancia.id, {
      data: destino,
      ordem: (await maiorOrdemDoDia(destino)) + 1,
      atualizadoEm: agora(),
    })
  }
  resultado.gruposVaziosMovidos = 1
  return resultado
}

/** Adia cards um dia (ver `destinoDoAdiamento`). */
export async function adiarGrupos(
  instanciaIds: string[],
  hoje: DataLocal,
): Promise<ResultadoMovimento> {
  return db.transaction('rw', db.tasks, db.groupInstances, async () => {
    const instancias = (await db.groupInstances.bulkGet(instanciaIds)).filter(
      (instancia): instancia is GroupInstance => instancia !== undefined,
    )
    const parciais: ResultadoMovimento[] = []
    for (const instancia of instancias) {
      parciais.push(await moverGrupos([instancia.id], destinoDoAdiamento(instancia.data, hoje)))
    }
    return juntarResultados(...parciais)
  })
}

/**
 * Arquiva o card: os itens pendentes saem do calendário. Com itens concluídos, o card fica
 * (concluído, como registro); sem eles, sai do calendário também.
 */
export async function arquivarGrupo(instanciaId: string) {
  await db.transaction('rw', db.tasks, db.groupInstances, async () => {
    const momento = agora()
    await db.tasks
      .where('groupInstanceId')
      .equals(instanciaId)
      .filter((item) => item.status === 'pendente')
      .modify({ status: 'arquivada', atualizadoEm: momento })
    const { concluidas } = await itensVisiveis(instanciaId)
    if (concluidas.length === 0) {
      await db.groupInstances.update(instanciaId, { arquivado: true, atualizadoEm: momento })
    }
  })
}

/**
 * Exclusão definitiva do card, com os itens, subtarefas, anotações e anexos deles.
 * A série some quando fica sem nenhum card.
 */
export async function excluirGrupo(instanciaId: string) {
  await db.transaction(
    'rw',
    [db.tasks, db.subtasks, db.notes, db.attachments, db.groupSeries, db.groupInstances],
    async () => {
      const instancia = await db.groupInstances.get(instanciaId)
      if (!instancia) return
      const idsItens = await db.tasks.where('groupInstanceId').equals(instanciaId).primaryKeys()
      const donos = idsItens.map((id) => ({ tipo: 'task' as const, id }))
      await excluirAnexosDe(donos)
      await excluirNotasDe(donos)
      await db.subtasks.where('taskId').anyOf(idsItens).delete()
      await db.tasks.bulkDelete(idsItens)
      await db.groupInstances.delete(instanciaId)
      const restantes = await db.groupInstances.where('seriesId').equals(instancia.seriesId).count()
      if (restantes === 0) await db.groupSeries.delete(instancia.seriesId)
    },
  )
}

/** Move tarefas (soltas ou itens) e cards juntos, como a seleção múltipla faz. */
export async function moverTarefasEGrupos(
  idsTarefas: string[],
  idsGrupos: string[],
  destino: DataLocal,
) {
  return db.transaction('rw', db.tasks, db.groupInstances, async () =>
    juntarResultados(
      await moverGrupos(idsGrupos, destino),
      await moverTarefas(idsTarefas, destino),
    ),
  )
}

/** Adia tarefas (soltas ou itens) e cards juntos, como a seleção múltipla faz. */
export async function adiarTarefasEGrupos(
  idsTarefas: string[],
  idsGrupos: string[],
  hoje: DataLocal,
) {
  return db.transaction('rw', db.tasks, db.groupInstances, async () =>
    juntarResultados(await adiarGrupos(idsGrupos, hoje), await adiarTarefas(idsTarefas, hoje)),
  )
}
