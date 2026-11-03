/** Data local no formato `YYYY-MM-DD` (America/Sao_Paulo). Nunca um `Date`. */
export type DataLocal = string

/** Campos presentes em toda entidade; preparam a sincronização futura com backend. */
export interface EntidadeBase {
  id: string
  criadoEm: string
  atualizadoEm: string
}

/**
 * Ícone escolhido no seletor, mostrado antes do título/nome: um emoji Unicode, o slug de uma
 * marca do Simple Icons (ex.: `github`; `memoria` = o símbolo do próprio app) ou um ícone
 * genérico do lucide (`pacote`, `nuvem`, `servidor`), oferecido no lugar de marca proibida.
 * Emojis digitados no meio do texto ficam no texto.
 */
export interface Icone {
  tipo: 'emoji' | 'marca' | 'generico'
  valor: string
}

/** Onde a categoria é usada: em grupos e tarefas soltas, ou só na aba Procedimentos. */
export type TipoCategoria = 'grupo' | 'procedimento'

export interface Category extends EntidadeBase {
  nome: string
  cor: string
  tipo: TipoCategoria
  /** Posição definida pelo usuário dentro do tipo (aceita decimais); vale em todo o app. */
  ordem: number
  icone?: Icone
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
  /** Momento em que foi arquivada (`status` `arquivada`); some ao desarquivar. */
  arquivadoEm?: string
  /** É o que a pessoa está fazendo agora. Ausente = não; regras em `lib/andamento`. */
  emAndamento?: boolean
  /** Momento em que foi marcada em andamento (junto com `emAndamento`). */
  emAndamentoDesde?: string
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
  /** Momento em que o card foi arquivado (com todos os itens dentro). */
  arquivadoEm?: string
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
  /**
   * Id do primeiro item da cadeia `origemItemId` (o próprio id no item original). Copiado em
   * toda cópia e nunca muda, mesmo que o primeiro item seja apagado: as notas do item apontam
   * para ele e aparecem em todos os dias da cadeia.
   */
  cadeiaId: string
  /** Preservada nas cópias; base do "pendente desde". */
  dataOriginal: DataLocal
  /** Momento em que o item foi arquivado sozinho (`status` `arquivado`). */
  arquivadoEm?: string
  /** É o que a pessoa está fazendo agora (só item pendente). Ausente = não. */
  emAndamento?: boolean
  /** Momento em que foi marcado em andamento (junto com `emAndamento`). */
  emAndamentoDesde?: string
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
  icone?: Icone
  categoryId?: string
  subcategoryId?: string
  etapas: Etapa[]
  /** Arquivado: fora da aba Procedimentos e dos seletores, sem apagar. */
  arquivado?: boolean
  arquivadoEm?: string
}

/** Dono de anexo: tarefa solta ou nota. */
export type TipoDono = 'task' | 'note'

export interface Dono {
  tipo: TipoDono
  id: string
}

/** A que uma nota pode estar ligada. */
export type TipoVinculo = 'tarefa' | 'grupo' | 'item'

/**
 * Ligação da nota: `tarefa` → id da tarefa solta; `grupo` → id da série (vale em todos os
 * dias); `item` → `cadeiaId` do item (vale em todas as cópias levadas de dia em dia).
 */
export interface Vinculo {
  tipo: TipoVinculo
  id: string
}

export interface Note extends EntidadeBase {
  titulo: string
  conteudo: string
  /** Sem vínculo = nota avulsa. A categoria vem do que ela está ligada; não é guardada. */
  vinculo?: Vinculo
  /** Arquivada: fora da aba Notas e dos indicadores, sem apagar. */
  arquivado?: boolean
  arquivadoEm?: string
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
