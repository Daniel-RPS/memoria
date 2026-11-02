/** Data local no formato `YYYY-MM-DD` (America/Sao_Paulo). Nunca um `Date`. */
export type DataLocal = string

/** Campos presentes em toda entidade; preparam a sincronização futura com backend. */
export interface EntidadeBase {
  id: string
  criadoEm: string
  atualizadoEm: string
}

/** Onde a categoria é usada: em grupos e tarefas soltas, ou só na aba Procedimentos. */
export type TipoCategoria = 'grupo' | 'procedimento'

export interface Category extends EntidadeBase {
  nome: string
  cor: string
  tipo: TipoCategoria
  /** Posição definida pelo usuário dentro do tipo (aceita decimais); vale em todo o app. */
  ordem: number
}

export interface Subcategory extends EntidadeBase {
  categoryId: string
  nome: string
  /** Sem cor própria, a interface usa uma variação da cor da categoria. */
  cor?: string
  /** Posição dentro da categoria (aceita decimais). */
  ordem: number
}

export type TaskStatus = 'pendente' | 'concluida' | 'arquivada'

export interface Task extends EntidadeBase {
  titulo: string
  data: DataLocal
  categoryId?: string
  subcategoryId?: string
  /** Aceita decimais: inserir entre 1 e 2 grava 1.5 sem renumerar o dia. */
  ordem: number
  status: TaskStatus
  /** Definida só na criação; base da contagem de dias pendentes. */
  dataOriginal: DataLocal
  concluidaEm?: string
}

/**
 * O que liga os cards de um grupo em dias diferentes (ex.: "Casa").
 * Independente das categorias: a categoria aqui só dá cor e filtro.
 */
export interface GroupSeries extends EntidadeBase {
  /** Único entre as séries, sem diferenciar acento e maiúscula. */
  titulo: string
  categoryId?: string
  subcategoryId?: string
}

/** O card de uma série num dia. No máximo um card por série e dia. */
export interface GroupCard extends EntidadeBase {
  seriesId: string
  data: DataLocal
  /** Mesma escala da `ordem` das tarefas soltas do dia. */
  ordem: number
  /** Fora do calendário. */
  arquivado: boolean
  /**
   * Nasceu para receber itens levados de outro dia. Se perder esses itens (a transferência
   * foi desfeita) e ficar sem pendente nem feito, é apagado sozinho. Card criado à mão, não.
   */
  criadoPorTransferencia?: boolean
}

/** `transferido`: copiado para o card de outro dia; fica no original como registro. */
export type GroupItemStatus = 'pendente' | 'concluido' | 'transferido' | 'arquivado'

/** Item de um card, com caixa de seleção. */
export interface GroupItem extends EntidadeBase {
  cardId: string
  titulo: string
  /** Posição dentro do card. */
  ordem: number
  status: GroupItemStatus
  concluidoEm?: string
  /** Card que recebeu a cópia (quando `transferido`). */
  transferidoParaCardId?: string
  /** Item do qual este é cópia. */
  origemItemId?: string
  /** Preservada nas cópias; base do "pendente desde". */
  dataOriginal: DataLocal
}

export interface Subtask extends EntidadeBase {
  taskId: string
  titulo: string
  concluida: boolean
  ordem: number
}

/** Etapa de um procedimento. A numeração na tela vem da `ordem` (0, 1, 2…). */
export interface Etapa {
  id: string
  texto: string
  ordem: number
}

export interface Procedure extends EntidadeBase {
  titulo: string
  categoryId?: string
  subcategoryId?: string
  etapas: Etapa[]
}

export type TipoDono = 'task' | 'note'

export interface Dono {
  tipo: TipoDono
  id: string
}

export interface Note extends EntidadeBase {
  titulo: string
  conteudo: string
  dono?: Dono
}

export type TipoAnexo = 'foto' | 'desenho' | 'audio' | 'link'

export interface Attachment extends EntidadeBase {
  dono: Dono
  tipo: TipoAnexo
  nome: string
  mime?: string
  blob?: Blob
  url?: string
}
