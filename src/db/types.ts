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

/**
 * Posição escolhida arrastando dentro de um bloco do topo (prioridade e/ou em andamento). Só vale
 * enquanto `chave` for a do bloco com as mesmas marcas (`chaveDoTopo`): marcar de novo ou
 * trocar de bloco a invalida sozinha. Ver `domain/ordem-de-exibicao`.
 */
export interface OrdemNoTopo {
  chave: string
  posicao: number
}

export type TaskStatus = 'pendente' | 'concluida' | 'arquivada'

export interface Task extends EntidadeBase {
  titulo: string
  data: DataLocal
  categoryId?: string
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
  /**
   * Concluída sozinha ao marcar a última subetapa pendente: desmarcar uma subetapa reabre a
   * tarefa. Marcar ou desmarcar a tarefa direto apaga a marca. Ausente = não.
   */
  concluidaPelasSubetapas?: boolean
  /** Prioridade (bandeira), só de tarefa pendente. Ausente = não; regras em `domain/prioridade`. */
  prioridade?: boolean
  /** Momento em que foi marcada como prioridade (junto com `prioridade`). */
  prioridadeDesde?: string
  /** Posição arrastada dentro do bloco do topo; ausente ou velha = pela hora da marcação. */
  ordemNoTopo?: OrdemNoTopo
  /** Horário de início `HH:mm` (24h), só para mostrar. Ausente = sem horário; `domain/horario`. */
  horario?: string
}

/**
 * O que liga os cards de um grupo em dias diferentes (ex.: "Casa").
 * Independente das categorias: a categoria aqui só dá cor e filtro.
 */
export interface GroupSeries extends EntidadeBase {
  /** Único entre as séries, sem diferenciar acento e maiúscula. */
  titulo: string
  categoryId?: string
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
  /** Concluído sozinho pela última subetapa (ver `Task.concluidaPelasSubetapas`). */
  concluidaPelasSubetapas?: boolean
  /** Prioridade (bandeira), só de item pendente. Ausente = não. */
  prioridade?: boolean
  /** Momento em que foi marcado como prioridade (junto com `prioridade`). */
  prioridadeDesde?: string
  /** Posição arrastada dentro do bloco do topo; ausente ou velha = pela hora da marcação. */
  ordemNoTopo?: OrdemNoTopo
  /** Horário de início `HH:mm` (24h), só para mostrar. Ausente = sem horário; `domain/horario`. */
  horario?: string
}

/**
 * Subetapa de uma tarefa solta OU de um item de grupo. `taskId` guarda o id do dono (nome mantido
 * para não exigir migração): os ids são UUIDs, não colidem, e `colocarNoGrupo`/`tirarDoGrupo`
 * preservam o id, então as subetapas acompanham a conversão. Levar o item a outro dia COPIA as
 * subetapas para o item novo (`planejarLevarItens`).
 */
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
  etapas: Etapa[]
  /** Posição manual dentro da categoria (aceita decimais); regras em `domain/procedimentos`. */
  ordem: number
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
export type TipoVinculo = 'tarefa' | 'grupo' | 'item' | 'procedimento'

/**
 * Ligação da nota: `tarefa` → id da tarefa solta; `grupo` → id da série (vale em todos os
 * dias); `item` → `cadeiaId` do item (vale em todas as cópias levadas de dia em dia);
 * `procedimento` → id do procedimento (o procedimento inteiro, não uma etapa).
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

/**
 * Um período em que uma tarefa solta ou um item de grupo esteve marcado como "Em andamento".
 * Uma mesma tarefa/item pode ter várias sessões (pausou e voltou, ou passou para outro dia).
 */
export interface TimeSession extends EntidadeBase {
  /** Id da tarefa solta (quando a sessão é de tarefa solta). */
  tarefaId?: string
  /** Id do item de grupo no dia em que a sessão rodou (quando é item de grupo). */
  itemId?: string
  /** `GroupItem.cadeiaId` do item: une todas as cópias levadas entre dias como a mesma tarefa. */
  cadeiaId?: string
  /** `GroupSeries.id` do grupo a que o item pertence. */
  grupoId?: string
  /** Categoria da tarefa ou do grupo (`undefined` = sem categoria). */
  categoryId?: string
  /** Momento ISO (UTC) em que o andamento começou. */
  inicio: string
  /** Momento ISO (UTC) em que o andamento parou; ausente enquanto a sessão está aberta. */
  fim?: string
}

/** Por onde o aviso chega. Por ora só dentro do app; WhatsApp e e-mail entram depois. */
export type CanalDeAviso = 'app'

/** O que recebe o lembrete: tarefa solta ou item de grupo (o id é o mesmo ao converter). */
export type TipoAlvoDoLembrete = 'tarefa' | 'item'

/**
 * Aviso ligado a uma tarefa solta ou item de grupo, `antecedenciaMin` minutos antes do dia +
 * horário dele. O momento NUNCA é gravado: é calculado na hora (`domain/lembretes`), então
 * acompanha mover, adiar e mudar o horário. Concluir, arquivar ou transferir não apaga: o
 * lembrete só é ignorado enquanto o alvo não estiver ativo.
 */
export interface Lembrete extends EntidadeBase {
  alvoTipo: TipoAlvoDoLembrete
  alvoId: string
  /** Minutos antes do horário (0 = no horário). */
  antecedenciaMin: number
  canais: CanalDeAviso[]
  /**
   * Dia e horário do alvo (`YYYY-MM-DDTHH:mm`) quando o estado abaixo foi decidido. Se o alvo
   * mudou de dia ou de horário, o lembrete é recalculado (volta a pendente ou é silenciado).
   */
  referencia?: string
  /** Momento ISO em que disparou (com o app aberto). */
  disparadoEm?: string
  /** Venceu com o app fechado: aparece em "Anteriores" e conta como não visto. */
  perdido?: boolean
  /** O momento passou sem aviso (alvo mudou para o passado ou estava inativo): sem card nem bolinha. */
  silenciado?: boolean
  /** A pessoa viu o aviso (fechou o card, clicou nele ou abriu a aba Notificações). */
  visto?: boolean
}

/**
 * Registro de uma tarefa solta ou item de grupo empurrado para um dia POSTERIOR (adiar, mover,
 * arrastar, levar pendentes do grupo). Gravado no mesmo lugar da mudança; a volta para um dia
 * anterior não gera registro e o "Desfazer" apaga o que a ação gravou. Base da contagem
 * "Adiadas" em Dados › Números (`domain/numeros`).
 */
export interface Adiamento {
  id: string
  /** Id da tarefa solta (quando foi uma tarefa solta). */
  tarefaId?: string
  /** Id do item de grupo no dia de onde saiu (quando foi um item). */
  itemId?: string
  deData: DataLocal
  paraData: DataLocal
  /** Momento ISO (UTC) da mudança. */
  em: string
}
