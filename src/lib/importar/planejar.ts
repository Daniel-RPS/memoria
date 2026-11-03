import type { DataLocal } from '@/db/types'
import { mesmoTituloDeSerie } from '@/lib/grupos'
import type {
  GrupoImportado,
  NotaImportada,
  ProcedimentoImportado,
  RascunhoDeImportacao,
  TarefaImportada,
} from '@/lib/importar/rascunho'

/**
 * Regras puras entre a prévia e a gravação: o que está marcado, o que já existe (duplicado) e
 * o que fazer com o duplicado. Duplicado = mesmo título no mesmo dia (tarefa e grupo) ou mesmo
 * título (procedimento e nota), sem diferenciar acento e maiúscula.
 */

export type AcaoParaDuplicado = 'pular' | 'importar' | 'substituir'

export const ROTULO_DA_ACAO: Record<AcaoParaDuplicado, string> = {
  pular: 'Pular',
  importar: 'Importar mesmo assim',
  substituir: 'Substituir',
}

/** O que já está no banco, só com o necessário para comparar. */
export interface Existentes {
  tarefas: { id: string; titulo: string; data: DataLocal }[]
  /** Card do grupo no dia, pelo título da série. */
  grupos: { cardId: string; titulo: string; data: DataLocal }[]
  procedimentos: { id: string; titulo: string }[]
  notas: { id: string; titulo: string }[]
}

/** Chave da entrada no rascunho → id do que já existe (card, no caso de grupo). */
export type Duplicados = ReadonlyMap<string, string>

export function acharDuplicados(
  rascunho: RascunhoDeImportacao,
  existentes: Existentes,
  dataPadrao: DataLocal,
): Duplicados {
  const duplicados = new Map<string, string>()
  const igual = mesmoTituloDeSerie
  for (const tarefa of rascunho.tarefas) {
    const data = tarefa.data ?? dataPadrao
    const achada = existentes.tarefas.find(
      (outra) => outra.data === data && igual(outra.titulo, tarefa.titulo),
    )
    if (achada) duplicados.set(tarefa.chave, achada.id)
  }
  for (const grupo of rascunho.grupos) {
    const data = grupo.data ?? dataPadrao
    const achado = existentes.grupos.find(
      (outro) => outro.data === data && igual(outro.titulo, grupo.titulo),
    )
    if (achado) duplicados.set(grupo.chave, achado.cardId)
  }
  for (const procedimento of rascunho.procedimentos) {
    const achado = existentes.procedimentos.find((outro) =>
      igual(outro.titulo, procedimento.titulo),
    )
    if (achado) duplicados.set(procedimento.chave, achado.id)
  }
  for (const nota of rascunho.notas) {
    if (!nota.titulo.trim()) continue
    const achada = existentes.notas.find((outra) => igual(outra.titulo, nota.titulo))
    if (achada) duplicados.set(nota.chave, achada.id)
  }
  return duplicados
}

/** Uma entrada pronta para gravar: nova ou substituindo o que já existe (`substitui`). */
export type Planejada<T> = { entrada: T; substitui?: string }

export interface PlanoDeImportacao {
  tarefas: Planejada<TarefaImportada & { data: DataLocal }>[]
  grupos: Planejada<GrupoImportado & { data: DataLocal }>[]
  procedimentos: Planejada<ProcedimentoImportado>[]
  notas: Planejada<NotaImportada>[]
}

export interface OpcoesDoPlano {
  /** Chaves desmarcadas na prévia: ficam de fora. */
  desmarcadas: ReadonlySet<string>
  duplicados: Duplicados
  acao: AcaoParaDuplicado
  /** Dia das tarefas e grupos que vieram sem data. */
  dataPadrao: DataLocal
}

/** Só o que está marcado, com o dia definido e a decisão sobre os duplicados aplicada. */
export function planejarImportacao(
  rascunho: RascunhoDeImportacao,
  opcoes: OpcoesDoPlano,
): PlanoDeImportacao {
  function planejar<T extends { chave: string }>(entradas: T[]): Planejada<T>[] {
    return entradas.flatMap((entrada) => {
      if (opcoes.desmarcadas.has(entrada.chave)) return []
      const existente = opcoes.duplicados.get(entrada.chave)
      if (!existente || opcoes.acao === 'importar') return [{ entrada }]
      if (opcoes.acao === 'pular') return []
      return [{ entrada, substitui: existente }]
    })
  }
  const comData = <T extends { data?: DataLocal }>(entrada: T) => ({
    ...entrada,
    data: entrada.data ?? opcoes.dataPadrao,
  })
  return {
    tarefas: planejar(rascunho.tarefas.map(comData)),
    grupos: planejar(rascunho.grupos.map(comData)),
    procedimentos: planejar(rascunho.procedimentos),
    notas: planejar(rascunho.notas),
  }
}

export function contarPlano(plano: PlanoDeImportacao) {
  return (
    plano.tarefas.length + plano.grupos.length + plano.procedimentos.length + plano.notas.length
  )
}

/** "1 item importado", "32 itens importados". */
export function textoImportados(quantidade: number) {
  return quantidade === 1 ? '1 item importado' : `${quantidade} itens importados`
}

/** Nomes de categoria pedidos pelo rascunho (rótulo, coluna, backup), sem repetir. */
export function categoriasDoRascunho(entradas: { categoria?: string }[]) {
  const nomes: string[] = []
  for (const { categoria } of entradas) {
    const nome = categoria?.trim()
    if (nome && !nomes.some((outro) => mesmoTituloDeSerie(outro, nome))) nomes.push(nome)
  }
  return nomes
}
