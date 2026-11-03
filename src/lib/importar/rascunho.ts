import type { DataLocal, TipoAnexo } from '@/db/types'

/**
 * Formato intermediário da importação (ImportDraft): todo leitor (Markdown, CSV, Google Keep,
 * backup do MemorIA) devolve isto, e uma função só (`importarRascunho`) grava. Nada aqui tem id
 * do banco: `chave` identifica a entrada na prévia (desmarcar, duplicados).
 */

export interface TarefaImportada {
  chave: string
  titulo: string
  /** Sem data: vai para o dia escolhido na prévia. */
  data?: DataLocal
  isConcluida: boolean
  subtarefas: { titulo: string; isConcluida: boolean }[]
  /** Nome da categoria (rótulo, coluna, backup); vira categoria só se o usuário escolher. */
  categoria?: string
}

export interface GrupoImportado {
  chave: string
  titulo: string
  data?: DataLocal
  itens: { titulo: string; isConcluido: boolean }[]
  categoria?: string
}

export interface ProcedimentoImportado {
  chave: string
  titulo: string
  etapas: string[]
  categoria?: string
}

export interface AnexoImportado {
  nome: string
  tipo: TipoAnexo
  /** Foto, desenho e áudio. */
  blob?: Blob
  /** Link (só http/https). */
  url?: string
}

export interface NotaImportada {
  chave: string
  titulo: string
  conteudo: string
  /** Momento ISO da última edição na origem (Keep); sem ele, agora. */
  editadaEm?: string
  anexos: AnexoImportado[]
}

export interface RascunhoDeImportacao {
  tarefas: TarefaImportada[]
  grupos: GrupoImportado[]
  procedimentos: ProcedimentoImportado[]
  notas: NotaImportada[]
  /** O que não deu para entender (linha, arquivo): mostrado na prévia, sem travar o resto. */
  avisos: string[]
  /** Anexos ou notas deixados de fora de propósito (ex.: áudio sem suporte, lixeira). */
  ignorados: string[]
}

export function rascunhoVazio(): RascunhoDeImportacao {
  return { tarefas: [], grupos: [], procedimentos: [], notas: [], avisos: [], ignorados: [] }
}

/** Junta os rascunhos de vários arquivos num só (chaves já são únicas por arquivo). */
export function juntarRascunhos(rascunhos: RascunhoDeImportacao[]): RascunhoDeImportacao {
  const junto = rascunhoVazio()
  for (const rascunho of rascunhos) {
    junto.tarefas.push(...rascunho.tarefas)
    junto.grupos.push(...rascunho.grupos)
    junto.procedimentos.push(...rascunho.procedimentos)
    junto.notas.push(...rascunho.notas)
    junto.avisos.push(...rascunho.avisos)
    junto.ignorados.push(...rascunho.ignorados)
  }
  return junto
}

/** Quantas entradas o rascunho cria (tarefas, grupos, procedimentos e notas). */
export function contarEntradas(rascunho: RascunhoDeImportacao) {
  return (
    rascunho.tarefas.length +
    rascunho.grupos.length +
    rascunho.procedimentos.length +
    rascunho.notas.length
  )
}

/** Limite por arquivo (e da soma): acima disso a leitura nem começa. */
export const TAMANHO_MAXIMO_BYTES = 20 * 1024 * 1024
export const TAMANHO_MAXIMO_TEXTO = '20 MB'
