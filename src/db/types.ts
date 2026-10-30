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

export interface Step {
  id: string
  ordem: number
  texto: string
  codigo?: string
  alerta?: string
  anexos: string[]
  subpassos: Step[]
}

export interface Secao {
  id: string
  titulo: string
  ordem: number
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
  versao: number
  data: DataLocal
  valoresCampos: Record<string, string>
  passosMarcados: string[]
  passosPulados: string[]
  observacoes: string
  taskId?: string
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
