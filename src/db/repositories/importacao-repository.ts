import { db } from '@/db/database'
import type { Category, GroupItem, Note, Procedure, Subtask, Task, TipoCategoria } from '@/db/types'
import { adicionarAnexo, excluirAnexo } from '@/db/repositories/attachment-repository'
import { criarCategoria, excluirCategoria } from '@/db/repositories/category-repository'
import {
  adicionarItensNaSerie,
  criarGrupo,
  definirConclusaoItem,
  desfazerItensAdicionados,
  excluirGrupo,
  type ItensAdicionados,
} from '@/db/repositories/group-repository'
import { criarNota, excluirNota } from '@/db/repositories/note-repository'
import { agora } from '@/db/repositories/ordenacao'
import { criarProcedimento, excluirProcedimento } from '@/db/repositories/procedure-repository'
import { criarSubtarefa } from '@/db/repositories/subtask-repository'
import { criarTarefa, definirConclusao, excluirTarefa } from '@/db/repositories/task-repository'
import { categoriasDoTipo, isMesmoNome } from '@/lib/categorias'
import { mesmoTituloDeSerie } from '@/lib/grupos'
import type { Existentes, PlanoDeImportacao } from '@/lib/importar/planejar'
import type { AnexoImportado } from '@/lib/importar/rascunho'
import { numerarEtapas } from '@/lib/procedimentos'

/**
 * Grava o que veio de fora (Markdown, CSV, Google Keep, partes de um backup) SEM substituir o
 * banco: tudo numa transação só, reaproveitando as regras de cada repositório, e guarda o que
 * precisa para o "Desfazer" (o que foi criado e como estava o que foi substituído).
 */

const TODAS_AS_TABELAS = () => [
  db.categories,
  db.tasks,
  db.subtasks,
  db.groupSeries,
  db.groupCards,
  db.groupItems,
  db.procedures,
  db.notes,
  db.attachments,
  db.sessions,
]

/** Categoria das entradas de um tipo (Grupos para tarefas e grupos; Procedimentos). */
export type CategoriaDoDestino =
  | { modo: 'nenhuma' }
  | { modo: 'escolhida'; categoryId: string }
  /** Pelo nome que veio (rótulo, coluna, backup): usa a do tipo com esse nome ou cria. */
  | { modo: 'da-origem' }

export interface OpcoesDeGravacao {
  categoriaDeGrupo: CategoriaDoDestino
  categoriaDeProcedimento: CategoriaDoDestino
}

export interface ResultadoImportacao {
  quantidade: number
  desfazer: {
    tarefas: string[]
    procedimentos: string[]
    notas: string[]
    anexos: string[]
    gruposNovos: string[]
    itensAdicionados: ItensAdicionados[]
    categorias: string[]
    anteriores: {
      tarefas: Task[]
      subtarefas: Subtask[]
      procedimentos: Procedure[]
      notas: Note[]
      itens: GroupItem[]
    }
  }
}

/** O que já existe, para a prévia apontar duplicados. */
export async function carregarExistentes(): Promise<Existentes> {
  const [tarefas, series, cards, procedimentos, notas] = await Promise.all([
    db.tasks.toArray(),
    db.groupSeries.toArray(),
    db.groupCards.toArray(),
    db.procedures.toArray(),
    db.notes.toArray(),
  ])
  const tituloDaSerie = new Map(series.map((serie) => [serie.id, serie.titulo]))
  return {
    tarefas: tarefas
      .filter((tarefa) => tarefa.status !== 'arquivada')
      .map(({ id, titulo, data }) => ({ id, titulo, data })),
    grupos: cards
      .filter((card) => !card.arquivado)
      .map((card) => ({
        cardId: card.id,
        titulo: tituloDaSerie.get(card.seriesId) ?? '',
        data: card.data,
      })),
    procedimentos: procedimentos.map(({ id, titulo }) => ({ id, titulo })),
    notas: notas.map(({ id, titulo }) => ({ id, titulo })),
  }
}

export async function importarRascunho(
  plano: PlanoDeImportacao,
  opcoes: OpcoesDeGravacao,
): Promise<ResultadoImportacao> {
  const desfazer: ResultadoImportacao['desfazer'] = {
    tarefas: [],
    procedimentos: [],
    notas: [],
    anexos: [],
    gruposNovos: [],
    itensAdicionados: [],
    categorias: [],
    anteriores: { tarefas: [], subtarefas: [], procedimentos: [], notas: [], itens: [] },
  }

  await db.transaction('rw', TODAS_AS_TABELAS(), async () => {
    const categorias = await db.categories.toArray()

    /** Id da categoria para a entrada, criando a "da origem" que não existe (uma vez só). */
    async function categoriaPara(tipo: TipoCategoria, nomeDaOrigem?: string) {
      const destino = tipo === 'grupo' ? opcoes.categoriaDeGrupo : opcoes.categoriaDeProcedimento
      if (destino.modo === 'escolhida') {
        return { categoryId: destino.categoryId }
      }
      const nome = nomeDaOrigem?.trim()
      if (destino.modo === 'nenhuma' || !nome) return {}
      let categoria: Category | undefined = categoriasDoTipo(categorias, tipo).find((outra) =>
        isMesmoNome(outra.nome, nome),
      )
      if (!categoria) {
        categoria = await criarCategoria({ nome, tipo })
        categorias.push(categoria)
        desfazer.categorias.push(categoria.id)
      }
      return { categoryId: categoria.id }
    }

    for (const { entrada, substitui } of plano.tarefas) {
      const categoria = await categoriaPara('grupo', entrada.categoria)
      let id = substitui
      if (id) {
        const anterior = await db.tasks.get(id)
        if (!anterior) continue
        desfazer.anteriores.tarefas.push(anterior)
        const subtarefas = await db.subtasks.where('taskId').equals(id).toArray()
        desfazer.anteriores.subtarefas.push(...subtarefas)
        await db.subtasks.bulkDelete(subtarefas.map((subtarefa) => subtarefa.id))
        if (categoria.categoryId) await db.tasks.update(id, { ...categoria, atualizadoEm: agora() })
      } else {
        id = (await criarTarefa({ titulo: entrada.titulo, data: entrada.data, ...categoria })).id
        desfazer.tarefas.push(id)
      }
      await definirConclusao(id, entrada.isConcluida)
      for (const subtarefa of entrada.subtarefas) {
        await criarSubtarefa({
          taskId: id,
          titulo: subtarefa.titulo,
          concluida: subtarefa.isConcluida,
        })
      }
    }

    for (const { entrada, substitui } of plano.grupos) {
      const categoria = await categoriaPara('grupo', entrada.categoria)
      let titulos = entrada.itens
      if (substitui) {
        // Substituir no grupo: os itens com o mesmo nome ganham o estado de fora; os outros entram.
        const itens = await db.groupItems.where('cardId').equals(substitui).toArray()
        titulos = []
        for (const item of entrada.itens) {
          const igual = itens.find(
            (outro) =>
              outro.status !== 'transferido' && mesmoTituloDeSerie(outro.titulo, item.titulo),
          )
          if (!igual) titulos.push(item)
          else if ((igual.status === 'concluido') !== item.isConcluido) {
            desfazer.anteriores.itens.push(igual)
            await definirConclusaoItem(igual.id, item.isConcluido)
          }
        }
        if (titulos.length === 0) continue
      }
      const serie = (await db.groupSeries.toArray()).find((outra) =>
        mesmoTituloDeSerie(outra.titulo, entrada.titulo),
      )
      let resultado: ItensAdicionados
      if (serie) {
        resultado = await adicionarItensNaSerie(
          serie.id,
          entrada.data,
          titulos.map((item) => item.titulo),
        )
        desfazer.itensAdicionados.push(resultado)
      } else {
        const card = await criarGrupo({ titulo: entrada.titulo, data: entrada.data, ...categoria })
        resultado = await adicionarItensNaSerie(
          card.seriesId,
          entrada.data,
          titulos.map((item) => item.titulo),
        )
        desfazer.gruposNovos.push(card.id)
      }
      for (const [indice, item] of titulos.entries()) {
        if (item.isConcluido) await definirConclusaoItem(resultado.idsItens[indice], true)
      }
    }

    for (const { entrada, substitui } of plano.procedimentos) {
      const categoria = await categoriaPara('procedimento', entrada.categoria)
      const etapas = numerarEtapas(
        entrada.etapas.map((texto) => ({ id: crypto.randomUUID(), texto })),
      )
      if (substitui) {
        const anterior = await db.procedures.get(substitui)
        if (!anterior) continue
        desfazer.anteriores.procedimentos.push(anterior)
        await db.procedures.update(substitui, {
          etapas,
          ...(categoria.categoryId ? categoria : {}),
          atualizadoEm: agora(),
        })
      } else {
        const criado = await criarProcedimento({
          titulo: entrada.titulo,
          etapas,
          // No formulário, categoria vazia = '' (sem categoria).
          categoryId: categoria.categoryId ?? '',
        })
        desfazer.procedimentos.push(criado.id)
      }
    }

    for (const { entrada, substitui } of plano.notas) {
      let id = substitui
      if (id) {
        const anterior = await db.notes.get(id)
        if (!anterior) continue
        desfazer.anteriores.notas.push(anterior)
        await db.notes.update(id, {
          conteudo: entrada.conteudo,
          atualizadoEm: entrada.editadaEm ?? agora(),
        })
      } else {
        id = (await criarNota({ titulo: entrada.titulo, conteudo: entrada.conteudo })).id
        desfazer.notas.push(id)
        // Data da última edição na origem (Keep, backup): o filtro por dia usa ela.
        if (entrada.editadaEm) {
          await db.notes.update(id, {
            criadoEm: entrada.editadaEm,
            atualizadoEm: entrada.editadaEm,
          })
        }
      }
      for (const anexo of entrada.anexos) {
        desfazer.anexos.push((await gravarAnexo(id, anexo)).id)
      }
    }
  })

  return {
    quantidade:
      plano.tarefas.length + plano.grupos.length + plano.procedimentos.length + plano.notas.length,
    desfazer,
  }
}

function gravarAnexo(notaId: string, anexo: AnexoImportado) {
  return adicionarAnexo({
    dono: { tipo: 'note', id: notaId },
    tipo: anexo.tipo,
    nome: anexo.nome,
    blob: anexo.blob,
    url: anexo.url,
  })
}

/** Desfaz `importarRascunho`: apaga o que entrou e devolve o que foi substituído como estava. */
export async function desfazerImportacao({ desfazer }: ResultadoImportacao) {
  await db.transaction('rw', TODAS_AS_TABELAS(), async () => {
    for (const id of desfazer.anexos) await excluirAnexo(id)
    for (const id of desfazer.notas) await excluirNota(id)
    for (const id of desfazer.procedimentos) await excluirProcedimento(id)
    for (const id of desfazer.tarefas) await excluirTarefa(id)
    for (const resultado of [...desfazer.itensAdicionados].reverse()) {
      await desfazerItensAdicionados(resultado)
    }
    for (const cardId of desfazer.gruposNovos) await excluirGrupo(cardId)

    const { anteriores } = desfazer
    const tarefasSubstituidas = anteriores.tarefas.map((tarefa) => tarefa.id)
    await db.subtasks.where('taskId').anyOf(tarefasSubstituidas).delete()
    await db.subtasks.bulkPut(anteriores.subtarefas)
    await db.tasks.bulkPut(anteriores.tarefas)
    await db.procedures.bulkPut(anteriores.procedimentos)
    await db.notes.bulkPut(anteriores.notas)
    await db.groupItems.bulkPut(anteriores.itens)

    for (const id of desfazer.categorias) await excluirCategoria(id)
  })
}
