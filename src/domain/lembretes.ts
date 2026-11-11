import { addDays, format, isSameDay, parse } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { DataLocal, Lembrete, TipoAlvoDoLembrete } from '@/db/types'
import { isHorarioValido } from '@/domain/horario'
import { diasEntre } from '@/lib/datas'

/**
 * Lembretes de tarefa solta e item de grupo: regras puras (sem banco nem tela). O momento do
 * aviso é sempre (dia + horário do alvo) − antecedência, calculado na hora, no fuso local do
 * navegador (America/Sao_Paulo).
 */

const MINUTOS_NA_HORA = 60
const MINUTOS_NO_DIA = 24 * MINUTOS_NA_HORA

/** As opções prontas, na ordem do popup: no horário, 10 min, 1 hora e 1 dia antes. */
export const ANTECEDENCIAS_PRONTAS = [0, 10, MINUTOS_NA_HORA, MINUTOS_NO_DIA] as const

/** Limites do aviso personalizado. */
export const ANTECEDENCIA_MINIMA_MIN = 1
export const ANTECEDENCIA_MAXIMA_MIN = 365 * MINUTOS_NO_DIA

/** Ao abrir o app, lembrete vencido há até isto ainda dispara; mais que isto vira "Perdido". */
export const JANELA_DE_DISPARO_MS = 60_000

/** Canais que todo lembrete novo recebe. */
export const CANAIS_PADRAO = ['app'] as const

export interface PartesDaAntecedencia {
  dias: number
  horas: number
  minutos: number
}

export type ResultadoAntecedencia =
  { isValida: true; minutos: number } | { isValida: false; mensagem: string }

/** Converte Dias/Horas/Minutos do "Personalizar" em minutos (1 min a 365 dias). */
export function minutosDaAntecedencia({
  dias,
  horas,
  minutos,
}: PartesDaAntecedencia): ResultadoAntecedencia {
  const partes = [dias, horas, minutos]
  if (partes.some((parte) => !Number.isInteger(parte) || parte < 0)) {
    return { isValida: false, mensagem: 'Use só números inteiros.' }
  }
  const total = dias * MINUTOS_NO_DIA + horas * MINUTOS_NA_HORA + minutos
  if (total < ANTECEDENCIA_MINIMA_MIN) {
    return { isValida: false, mensagem: 'O mínimo é 1 minuto.' }
  }
  if (total > ANTECEDENCIA_MAXIMA_MIN) {
    return { isValida: false, mensagem: 'O máximo é 365 dias.' }
  }
  return { isValida: true, minutos: total }
}

function plural(quantidade: number, singular: string, varios: string) {
  return `${quantidade} ${quantidade === 1 ? singular : varios}`
}

/** "10 min", "1 hora", "3 dias", "2 h 30 min", "1 dia 2 h" (sem o "antes"). */
export function duracaoDaAntecedencia(minutosTotais: number) {
  const dias = Math.floor(minutosTotais / MINUTOS_NO_DIA)
  const horas = Math.floor((minutosTotais % MINUTOS_NO_DIA) / MINUTOS_NA_HORA)
  const minutos = minutosTotais % MINUTOS_NA_HORA
  if (horas === 0 && minutos === 0) return plural(dias, 'dia', 'dias')
  if (dias === 0 && minutos === 0) return plural(horas, 'hora', 'horas')
  if (dias === 0 && horas === 0) return `${minutos} min`
  return [
    dias > 0 ? plural(dias, 'dia', 'dias') : '',
    horas > 0 ? `${horas} h` : '',
    minutos > 0 ? `${minutos} min` : '',
  ]
    .filter(Boolean)
    .join(' ')
}

/** Rótulo do aviso: "No horário do evento", "10 min antes", "2 h 30 min antes". */
export function rotuloDaAntecedencia(minutos: number) {
  if (minutos === 0) return 'No horário do evento'
  return `${duracaoDaAntecedencia(minutos)} antes`
}

/** Rótulo curto, para chips: "No horário", "10 min antes". */
export function rotuloCurtoDaAntecedencia(minutos: number) {
  return minutos === 0 ? 'No horário' : rotuloDaAntecedencia(minutos)
}

/** Linha de contexto do card de aviso: "Agora", "Em 10 min", "Em 1 hora", "Amanhã". */
export function contextoDoAviso(minutos: number) {
  if (minutos === 0) return 'Agora'
  if (minutos === MINUTOS_NO_DIA) return 'Amanhã'
  return `Em ${duracaoDaAntecedencia(minutos)}`
}

/** Dia e horário do alvo como texto comparável (`YYYY-MM-DDTHH:mm`); sem horário, nada. */
export function referenciaDoEvento(alvo: { data: DataLocal; horario?: string | undefined }) {
  return isHorarioValido(alvo.horario) ? `${alvo.data}T${alvo.horario}` : undefined
}

/** O momento do evento (data + horário local). */
export function momentoDoEvento(data: DataLocal, horario: string): Date {
  return parse(`${data} ${horario}`, 'yyyy-MM-dd HH:mm', new Date())
}

/** Momento do aviso = (dia + horário) − antecedência. */
export function momentoDoAviso(data: DataLocal, horario: string, antecedenciaMin: number): Date {
  return new Date(momentoDoEvento(data, horario).getTime() - antecedenciaMin * 60_000)
}

/** "hoje às 17:50", "amanhã às 09:00", "12/11 às 18:00" (em relação a `agora`). */
export function quandoTexto(momento: Date, agora: Date) {
  const hora = format(momento, 'HH:mm')
  if (isSameDay(momento, agora)) return `hoje às ${hora}`
  if (isSameDay(momento, addDays(agora, 1))) return `amanhã às ${hora}`
  if (isSameDay(momento, addDays(agora, -1))) return `ontem às ${hora}`
  return `${format(momento, 'dd/MM')} às ${hora}`
}

/** Texto abaixo da opção: "avisa hoje às 17:50" ou "já passou". */
export function textoDeQuandoAvisa(momento: Date, agora: Date) {
  return momento.getTime() <= agora.getTime() ? 'já passou' : `avisa ${quandoTexto(momento, agora)}`
}

/** O que o motor precisa saber do alvo de um lembrete. */
export interface AlvoDoLembrete {
  tipo: TipoAlvoDoLembrete
  id: string
  titulo: string
  data: DataLocal
  horario?: string | undefined
  /** Pendente (e, no item, card não arquivado). Concluída, arquivada ou transferida = não. */
  isAtivo: boolean
}

export type SituacaoDoLembrete =
  /** Ainda vai avisar. */
  | 'agendado'
  /** Chegou a hora: dispara o card agora. */
  | 'disparar'
  /** Já avisou (card mostrado). */
  | 'disparado'
  /** Venceu com o app fechado. */
  | 'perdido'
  /** O momento passou sem aviso de propósito: sem card, bolinha nem "Anteriores". */
  | 'silenciado'
  /** Alvo concluído, arquivado, transferido, sem horário ou que não existe mais. */
  | 'ignorado'

export type MudancaDoLembrete = Partial<
  Pick<Lembrete, 'alvoTipo' | 'referencia' | 'disparadoEm' | 'perdido' | 'silenciado' | 'visto'>
>

export interface Classificacao {
  situacao: SituacaoDoLembrete
  /** Momento do aviso, quando o alvo tem dia e horário. */
  momento?: Date
  /** O que gravar para o lembrete ficar coerente com a situação (ausente = nada). */
  mudanca?: MudancaDoLembrete
}

/** Zera o estado de disparo (o campo `undefined` some ao gravar com `update`). */
const ESTADO_LIMPO = {
  disparadoEm: undefined,
  perdido: undefined,
  silenciado: undefined,
  visto: undefined,
} as const

/**
 * Situação do lembrete agora.
 * - Alvo mudou de dia/horário (`referencia` diferente): momento futuro volta a agendado (zera
 *   o disparo); momento já passado é silenciado (não vira "Perdido").
 * - Momento passou sem disparo: alvo inativo → silenciado; dentro de `JANELA_DE_DISPARO_MS`
 *   (ou depois da última conferência desta sessão, `desde`) → dispara; senão → perdido.
 */
export function classificarLembrete(
  lembrete: Lembrete,
  alvo: AlvoDoLembrete | undefined,
  agora: Date,
  desde?: Date,
): Classificacao {
  if (!alvo) return { situacao: 'ignorado' }
  const referencia = referenciaDoEvento(alvo)
  if (!referencia || !alvo.horario) return { situacao: 'ignorado' }
  const momento = momentoDoAviso(alvo.data, alvo.horario, lembrete.antecedenciaMin)
  const isFuturo = momento.getTime() > agora.getTime()
  const tipo = lembrete.alvoTipo !== alvo.tipo ? { alvoTipo: alvo.tipo } : {}

  if (lembrete.referencia !== referencia) {
    if (isFuturo) {
      return {
        situacao: alvo.isAtivo ? 'agendado' : 'ignorado',
        momento,
        mudanca: { ...tipo, ...ESTADO_LIMPO, referencia },
      }
    }
    return {
      situacao: 'silenciado',
      momento,
      mudanca: { ...tipo, ...ESTADO_LIMPO, referencia, silenciado: true },
    }
  }
  const comTipo = (classificacao: Classificacao): Classificacao =>
    Object.keys(tipo).length > 0
      ? { ...classificacao, mudanca: { ...classificacao.mudanca, ...tipo } }
      : classificacao

  if (lembrete.silenciado) return comTipo({ situacao: 'silenciado', momento })
  if (lembrete.disparadoEm) return comTipo({ situacao: 'disparado', momento })
  if (lembrete.perdido) return comTipo({ situacao: 'perdido', momento })
  if (isFuturo) return comTipo({ situacao: alvo.isAtivo ? 'agendado' : 'ignorado', momento })
  if (!alvo.isAtivo) {
    return comTipo({ situacao: 'silenciado', momento, mudanca: { silenciado: true } })
  }
  const atraso = agora.getTime() - momento.getTime()
  const isDestaSessao = desde !== undefined && momento.getTime() > desde.getTime()
  if (atraso <= JANELA_DE_DISPARO_MS || isDestaSessao) {
    return comTipo({ situacao: 'disparar', momento })
  }
  return comTipo({ situacao: 'perdido', momento, mudanca: { perdido: true } })
}

/** Já avisou (ou venceu fechado) e a pessoa ainda não viu. */
export function isNaoVisto(lembrete: Lembrete) {
  return (
    !lembrete.silenciado &&
    (lembrete.disparadoEm !== undefined || lembrete.perdido === true) &&
    lembrete.visto !== true
  )
}

/** Quantos avisos não vistos (só os de alvo que ainda existe). */
export function contarNaoVistos(linhas: { lembrete: Lembrete; alvo?: AlvoDoLembrete }[]) {
  return linhas.filter(({ lembrete, alvo }) => alvo !== undefined && isNaoVisto(lembrete)).length
}

/** Título da aba do navegador: "(2) MemorIA" com não vistos; "MemorIA" sem. */
export function tituloDaAba(naoVistos: number, base = 'MemorIA') {
  return naoVistos > 0 ? `(${naoVistos}) ${base}` : base
}

/** Texto do badge: "3", "9+". */
export function textoDoBadge(naoVistos: number) {
  return naoVistos > 9 ? '9+' : String(naoVistos)
}

/** Cabeçalho do dia na lista: "Hoje", "Amanhã", "Ontem" ou "qui, 12/11". */
export function cabecalhoDoDia(data: DataLocal, hoje: DataLocal) {
  const distancia = diasEntre(hoje, data)
  if (distancia === 0) return 'Hoje'
  if (distancia === 1) return 'Amanhã'
  if (distancia === -1) return 'Ontem'
  const dia = parse(data, 'yyyy-MM-dd', new Date())
  return `${format(dia, 'EEEEEE', { locale: ptBR }).replace('.', '')}, ${format(dia, 'dd/MM')}`
}

export interface DiaDaLista<T> {
  data: DataLocal
  titulo: string
  linhas: T[]
}

/**
 * Agrupa as linhas por dia do evento, na ordem do próximo aviso: os dias seguem a primeira
 * linha de cada um e, dentro do dia, a ordem que veio (já ordenada por `proximoAviso`).
 */
export function agruparPorDia<T extends { data: DataLocal; proximoAviso: Date }>(
  linhas: T[],
  hoje: DataLocal,
): DiaDaLista<T>[] {
  const ordenadas = [...linhas].sort((a, b) => a.proximoAviso.getTime() - b.proximoAviso.getTime())
  const dias = new Map<DataLocal, T[]>()
  for (const linha of ordenadas) dias.set(linha.data, [...(dias.get(linha.data) ?? []), linha])
  return [...dias.entries()].map(([data, doDia]) => ({
    data,
    titulo: cabecalhoDoDia(data, hoje),
    linhas: doDia,
  }))
}

/** O próximo momento agendado (para o motor marcar a próxima conferência). */
export function proximoMomento(classificacoes: Classificacao[]) {
  const momentos = classificacoes
    .filter((classificacao) => classificacao.situacao === 'agendado' && classificacao.momento)
    .map((classificacao) => classificacao.momento!.getTime())
  return momentos.length > 0 ? new Date(Math.min(...momentos)) : undefined
}

/** "18:00 · Grupo X · Categoria" (só o que existir; a categoria só quando pedida). */
export function detalheDoAlvo(
  alvo: { horario?: string | undefined; nomeDoGrupo?: string; nomeDaCategoria?: string },
  isComCategoria = false,
) {
  return [alvo.horario, alvo.nomeDoGrupo, isComCategoria ? alvo.nomeDaCategoria : undefined]
    .filter(Boolean)
    .join(' · ')
}

/** Quantos anteriores a aba mostra no máximo. */
export const MAXIMO_DE_ANTERIORES = 50

export interface LinhaAgendada<A extends AlvoDoLembrete> {
  alvo: A
  data: DataLocal
  lembretes: Lembrete[]
  /** O próximo aviso que ainda vai disparar. */
  proximoAviso: Date
  /** Situação de cada lembrete (pelo id). */
  situacoes: Map<string, SituacaoDoLembrete>
}

export interface LinhaAnterior<A extends AlvoDoLembrete> {
  lembrete: Lembrete
  alvo: A
  momento: Date
  isPerdido: boolean
  isNaoVisto: boolean
}

/**
 * A aba Notificações: "Agendadas" = uma linha por tarefa ativa com pelo menos um aviso por vir;
 * "Anteriores" = avisos disparados ou perdidos, mais recentes primeiro (silenciados ficam fora).
 */
export function montarNotificacoes<A extends AlvoDoLembrete>(
  linhas: { lembrete: Lembrete; alvo?: A }[],
  agora: Date,
) {
  const porAlvo = new Map<string, { alvo: A; itens: { lembrete: Lembrete; c: Classificacao }[] }>()
  const anteriores: LinhaAnterior<A>[] = []
  let totalAgendados = 0
  for (const { lembrete, alvo } of linhas) {
    if (!alvo) continue
    const classificacao = classificarLembrete(lembrete, alvo, agora)
    const grupo = porAlvo.get(alvo.id) ?? { alvo, itens: [] }
    grupo.itens.push({ lembrete, c: classificacao })
    porAlvo.set(alvo.id, grupo)
    if (classificacao.situacao === 'agendado') totalAgendados += 1
    const isAnterior =
      !lembrete.silenciado && (lembrete.disparadoEm !== undefined || lembrete.perdido === true)
    if (isAnterior && classificacao.momento) {
      anteriores.push({
        lembrete,
        alvo,
        momento: lembrete.disparadoEm ? new Date(lembrete.disparadoEm) : classificacao.momento,
        isPerdido: lembrete.perdido === true,
        isNaoVisto: isNaoVisto(lembrete),
      })
    }
  }
  const agendadas: LinhaAgendada<A>[] = []
  for (const { alvo, itens } of porAlvo.values()) {
    const futuros = itens.filter(({ c }) => c.situacao === 'agendado' && c.momento)
    if (futuros.length === 0) continue
    agendadas.push({
      alvo,
      data: alvo.data,
      lembretes: itens
        .map(({ lembrete }) => lembrete)
        .sort((a, b) => b.antecedenciaMin - a.antecedenciaMin),
      proximoAviso: new Date(Math.min(...futuros.map(({ c }) => c.momento!.getTime()))),
      situacoes: new Map(itens.map(({ lembrete, c }) => [lembrete.id, c.situacao])),
    })
  }
  anteriores.sort((a, b) => b.momento.getTime() - a.momento.getTime())
  return { agendadas, anteriores, totalAgendados }
}
