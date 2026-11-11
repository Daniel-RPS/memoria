import { db } from '@/db/database'
import type {
  Category,
  GroupCard,
  GroupItem,
  GroupSeries,
  Lembrete,
  Task,
  TipoAlvoDoLembrete,
} from '@/db/types'
import { agora } from '@/db/repositories/ordenacao'
import {
  CANAIS_PADRAO,
  classificarLembrete,
  referenciaDoEvento,
  type AlvoDoLembrete,
  type Classificacao,
} from '@/domain/lembretes'

/** Alvo do lembrete com o que a tela mostra ("18:00 · Grupo X · Categoria"). */
export interface AlvoDetalhado extends AlvoDoLembrete {
  nomeDoGrupo?: string
  nomeDaCategoria?: string
}

export interface LembreteComAlvo {
  lembrete: Lembrete
  alvo?: AlvoDetalhado
}

/** Tarefa solta ou item de grupo, pelo id (os ids são UUIDs: o mesmo ao converter). */
export interface AlvoDeLembrete {
  tipo: TipoAlvoDoLembrete
  id: string
}

interface Fontes {
  tarefas: Map<string, Task>
  itens: Map<string, GroupItem>
  cards: Map<string, GroupCard>
  series: Map<string, GroupSeries>
  categorias: Map<string, Category>
}

async function lerFontes(ids: string[]): Promise<Fontes> {
  const unicos = [...new Set(ids)]
  const [tarefas, itens] = await Promise.all([
    db.tasks.bulkGet(unicos),
    db.groupItems.bulkGet(unicos),
  ])
  const itensExistentes = itens.filter((item): item is GroupItem => item !== undefined)
  const cards = (
    await db.groupCards.bulkGet([...new Set(itensExistentes.map((item) => item.cardId))])
  ).filter((card): card is GroupCard => card !== undefined)
  const series = (
    await db.groupSeries.bulkGet([...new Set(cards.map((card) => card.seriesId))])
  ).filter((serie): serie is GroupSeries => serie !== undefined)
  const categorias = await db.categories.toArray()
  return {
    tarefas: new Map(
      tarefas.filter((tarefa): tarefa is Task => tarefa !== undefined).map((t) => [t.id, t]),
    ),
    itens: new Map(itensExistentes.map((item) => [item.id, item])),
    cards: new Map(cards.map((card) => [card.id, card])),
    series: new Map(series.map((serie) => [serie.id, serie])),
    categorias: new Map(categorias.map((categoria) => [categoria.id, categoria])),
  }
}

function alvoDe(id: string, fontes: Fontes): AlvoDetalhado | undefined {
  const tarefa = fontes.tarefas.get(id)
  if (tarefa) {
    const categoria = tarefa.categoryId ? fontes.categorias.get(tarefa.categoryId) : undefined
    return {
      tipo: 'tarefa',
      id,
      titulo: tarefa.titulo,
      data: tarefa.data,
      horario: tarefa.horario,
      isAtivo: tarefa.status === 'pendente',
      ...(categoria ? { nomeDaCategoria: categoria.nome } : {}),
    }
  }
  const item = fontes.itens.get(id)
  if (!item) return undefined
  const card = fontes.cards.get(item.cardId)
  if (!card) return undefined
  const serie = fontes.series.get(card.seriesId)
  const categoria = serie?.categoryId ? fontes.categorias.get(serie.categoryId) : undefined
  return {
    tipo: 'item',
    id,
    titulo: item.titulo,
    data: card.data,
    horario: item.horario,
    isAtivo: item.status === 'pendente' && !card.arquivado,
    ...(serie ? { nomeDoGrupo: serie.titulo } : {}),
    ...(categoria ? { nomeDaCategoria: categoria.nome } : {}),
  }
}

/** Todos os lembretes com o alvo de cada um (ausente = o alvo não existe mais). */
export async function carregarLembretesComAlvos(): Promise<LembreteComAlvo[]> {
  const lembretes = await db.lembretes.toArray()
  const fontes = await lerFontes(lembretes.map((lembrete) => lembrete.alvoId))
  return lembretes.map((lembrete) => {
    const alvo = alvoDe(lembrete.alvoId, fontes)
    return alvo ? { lembrete, alvo } : { lembrete }
  })
}

/** Lembretes de um alvo (tarefa ou item). */
export function listarLembretesDe(alvoId: string) {
  return db.lembretes.where('alvoId').equals(alvoId).toArray()
}

/** Data e horário atuais do alvo (para gravar a `referencia` do lembrete novo). */
async function referenciaAtual(alvoId: string) {
  const fontes = await lerFontes([alvoId])
  const alvo = alvoDe(alvoId, fontes)
  return alvo ? referenciaDoEvento(alvo) : undefined
}

function novoLembrete(
  alvo: AlvoDeLembrete,
  antecedenciaMin: number,
  referencia: string | undefined,
  momento: string,
): Lembrete {
  return {
    id: crypto.randomUUID(),
    alvoTipo: alvo.tipo,
    alvoId: alvo.id,
    antecedenciaMin,
    canais: [...CANAIS_PADRAO],
    ...(referencia ? { referencia } : {}),
    criadoEm: momento,
    atualizadoEm: momento,
  }
}

const TABELAS_DO_ALVO = [
  db.lembretes,
  db.tasks,
  db.groupItems,
  db.groupCards,
  db.groupSeries,
  db.categories,
]

/**
 * Deixa o alvo exatamente com estes avisos: os que já existem ficam como estão (com o estado de
 * disparo), os que saíram são apagados e os novos entram. Deve ser chamada depois de gravar o
 * horário do alvo (a referência é a atual).
 */
export async function definirAvisos(alvo: AlvoDeLembrete, antecedencias: number[]) {
  await db.transaction('rw', TABELAS_DO_ALVO, async () => {
    const desejadas = new Set(antecedencias)
    const atuais = await listarLembretesDe(alvo.id)
    const sair = atuais.filter((lembrete) => !desejadas.has(lembrete.antecedenciaMin))
    const existentes = new Set(atuais.map((lembrete) => lembrete.antecedenciaMin))
    const entrar = [...desejadas].filter((minutos) => !existentes.has(minutos))
    await db.lembretes.bulkDelete(sair.map((lembrete) => lembrete.id))
    if (entrar.length === 0) return
    const referencia = await referenciaAtual(alvo.id)
    const momento = agora()
    await db.lembretes.bulkAdd(
      entrar.map((minutos) => novoLembrete(alvo, minutos, referencia, momento)),
    )
  })
}

/** Apaga os lembretes dos alvos (exclusão definitiva). Devolve os apagados. */
export async function apagarLembretesDe(alvoIds: string[]) {
  if (alvoIds.length === 0) return []
  const apagados = await db.lembretes.where('alvoId').anyOf(alvoIds).toArray()
  await db.lembretes.bulkDelete(apagados.map((lembrete) => lembrete.id))
  return apagados
}

/** Remove todos os avisos de um alvo. */
export async function removerAvisosDe(alvoId: string) {
  await db.transaction('rw', db.lembretes, () => apagarLembretesDe([alvoId]))
}

/**
 * A cópia de um item (levado a outro dia) recebe lembretes novos, clonados dos do item de
 * origem, sem o estado de disparo: a primeira conferência decide se ainda vão avisar.
 */
export async function clonarLembretesParaCopias(copias: { id: string; origemId: string }[]) {
  if (copias.length === 0) return
  const daOrigem = await db.lembretes
    .where('alvoId')
    .anyOf(copias.map((copia) => copia.origemId))
    .toArray()
  if (daOrigem.length === 0) return
  const momento = agora()
  const novos = copias.flatMap((copia) =>
    daOrigem
      .filter((lembrete) => lembrete.alvoId === copia.origemId)
      .map((lembrete) =>
        novoLembrete({ tipo: 'item', id: copia.id }, lembrete.antecedenciaMin, undefined, momento),
      ),
  )
  await db.lembretes.bulkAdd(novos)
}

/** Cria os lembretes de alvos recém-criados (captura rápida). */
export async function criarLembretesDe(alvos: AlvoDeLembrete[], antecedencias: number[]) {
  if (alvos.length === 0 || antecedencias.length === 0) return
  const fontes = await lerFontes(alvos.map((alvo) => alvo.id))
  const momento = agora()
  const unicas = [...new Set(antecedencias)]
  await db.lembretes.bulkAdd(
    alvos.flatMap((alvo) => {
      const detalhado = alvoDe(alvo.id, fontes)
      const referencia = detalhado ? referenciaDoEvento(detalhado) : undefined
      return unicas.map((minutos) => novoLembrete(alvo, minutos, referencia, momento))
    }),
  )
}

/** Aviso que acabou de disparar, com o que o card mostra. */
export interface AvisoDisparado {
  lembrete: Lembrete
  alvo: AlvoDetalhado
}

/**
 * Confere todos os lembretes numa transação: grava o que a classificação pede (recalculado,
 * silenciado, perdido) e marca `disparadoEm` nos que chegaram à hora. Como lê e grava na mesma
 * transação, com duas abas abertas só uma consegue disparar cada lembrete. `desde` = última
 * conferência desta sessão (o que venceu depois dela dispara mesmo atrasado).
 */
export async function conferirLembretes(
  momento: Date,
  desde?: Date,
): Promise<{ disparados: AvisoDisparado[]; classificacoes: Classificacao[] }> {
  return db.transaction('rw', TABELAS_DO_ALVO, async () => {
    const linhas = await carregarLembretesComAlvos()
    const disparados: AvisoDisparado[] = []
    const classificacoes: Classificacao[] = []
    const gravadoEm = momento.toISOString()
    for (const { lembrete, alvo } of linhas) {
      const classificacao = classificarLembrete(lembrete, alvo, momento, desde)
      classificacoes.push(classificacao)
      const mudanca = { ...classificacao.mudanca }
      if (classificacao.situacao === 'disparar' && alvo) {
        Object.assign(mudanca, { disparadoEm: gravadoEm })
        disparados.push({ lembrete: { ...lembrete, ...mudanca }, alvo })
      }
      if (Object.keys(mudanca).length > 0) {
        await db.lembretes.update(lembrete.id, { ...mudanca, atualizadoEm: gravadoEm })
      }
    }
    return { disparados, classificacoes }
  })
}

/** Marca os avisos como vistos (fechou o card ou clicou nele). */
export async function marcarVistos(ids: string[]) {
  if (ids.length === 0) return
  await db.transaction('rw', db.lembretes, async () => {
    const momento = agora()
    await db.lembretes.where('id').anyOf(ids).modify({ visto: true, atualizadoEm: momento })
  })
}

/** Abriu a aba Notificações: todos os avisos já disparados ou perdidos ficam vistos. */
export async function marcarTodosVistos() {
  await db.transaction('rw', db.lembretes, async () => {
    const momento = agora()
    await db.lembretes
      .filter(
        (lembrete) =>
          lembrete.visto !== true &&
          (lembrete.disparadoEm !== undefined || lembrete.perdido === true),
      )
      .modify({ visto: true, atualizadoEm: momento })
  })
}

/** "Limpar anteriores": apaga os lembretes que já avisaram ou se perderam. */
export async function limparAnteriores(ids: string[]) {
  await db.transaction('rw', db.lembretes, () => db.lembretes.bulkDelete(ids))
}
