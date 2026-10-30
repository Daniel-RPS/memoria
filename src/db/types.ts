/** Data local no formato `YYYY-MM-DD` (America/Sao_Paulo). Nunca um `Date`. */
export type DataLocal = string

/** Campos presentes em toda entidade; preparam a sincronização futura com backend. */
export interface EntidadeBase {
  id: string
  criadoEm: string
  atualizadoEm: string
}

export interface Category extends EntidadeBase {
  nome: string
  cor: string
}

export interface Subcategory extends EntidadeBase {
  categoryId: string
  nome: string
  /** Sem cor própria, a interface usa uma variação da cor da categoria. */
  cor?: string
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
  /** Tarefa agendada para executar este procedimento. */
  procedureId?: string
  /** Item de um grupo (card); sem ele, é tarefa solta. A categoria é cópia da série. */
  groupInstanceId?: string
}

/** O que os cards de um grupo têm em comum entre os dias (ex.: "Casa"). */
export interface GroupSeries extends EntidadeBase {
  /** Único entre as séries, sem diferenciar acento e maiúscula. */
  titulo: string
  categoryId?: string
  subcategoryId?: string
}

/** O card de uma série num dia. No máximo uma instância por série e dia. */
export interface GroupInstance extends EntidadeBase {
  seriesId: string
  data: DataLocal
  /** Mesma escala da `ordem` das tarefas soltas do dia. */
  ordem: number
  /** Fora do calendário (arquivado sem itens concluídos). */
  arquivado: boolean
}

export interface Subtask extends EntidadeBase {
  taskId: string
  titulo: string
  concluida: boolean
  ordem: number
}

export type TipoCampoVariavel = 'texto' | 'numero' | 'data' | 'credencial'

export interface CampoVariavel {
  id: string
  nome: string
  tipo: TipoCampoVariavel
  /** Para `credencial`: só ONDE a senha está (ex.: "cofre X, item Y"), nunca o valor. */
  localCredencial?: string
}

/** Subpasso: um nível só, sem subpassos próprios. */
export interface Subpasso {
  id: string
  texto: string
}

/** Passo de um procedimento. A ordem é a posição no array `passos` da seção. */
export interface Step {
  id: string
  texto: string
  codigo?: string
  alerta?: string
  anexos: string[]
  subpassos: Subpasso[]
}

/** Seção de um procedimento. A ordem é a posição no array `secoes`. */
export interface Secao {
  id: string
  titulo: string
  passos: Step[]
}

export interface Procedure extends EntidadeBase {
  titulo: string
  categoryId?: string
  descricao: string
  secoes: Secao[]
  camposVariaveis: CampoVariavel[]
  versao: number
}

export interface ProcedureVersion {
  id: string
  procedureId: string
  versao: number
  snapshot: Procedure
  alteradoEm: string
}

export interface Execution extends EntidadeBase {
  procedureId: string
  /** Versão do procedimento usada; a execução segue essa versão até o fim. */
  versao: number
  data: DataLocal
  /** Valor digitado por id do campo. Campos `credencial` não têm valor aqui. */
  valoresCampos: Record<string, string>
  passosMarcados: string[]
  passosPulados: string[]
  observacoes: string
  taskId?: string
  /** Ausente enquanto a execução está em andamento. */
  concluidaEm?: string
}

export type TipoDono = 'task' | 'note' | 'procedure' | 'step'

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
