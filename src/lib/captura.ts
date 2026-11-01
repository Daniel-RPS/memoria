import { z } from 'zod'
import type { DataLocal } from '@/db/types'
import { isDataLocalValida, somarDias } from '@/lib/datas'
import { esquemaTituloTarefa } from '@/lib/esquemas'
import { inicioDaSemana } from '@/lib/semana'

/** Regras da captura rápida do Início (o que criar, onde e quando). */

/** Tarefa solta, grupo novo ou item(ns) num grupo que já existe ("Em grupo…"). */
export type TipoCaptura = 'tarefa' | 'grupo' | 'em-grupo'

export const esquemaCaptura = z
  .object({
    titulo: esquemaTituloTarefa,
    tipo: z.enum(['tarefa', 'grupo', 'em-grupo']),
    categoryId: z.string().optional(),
    subcategoryId: z.string().optional(),
    /** Série escolhida em "Em grupo…". */
    seriesId: z.string().optional(),
    data: z.string().refine(isDataLocalValida, 'Escolha um dia.'),
    /** Do grupo novo ou a mais em "Em grupo…"; linhas em branco são ignoradas. */
    itens: z.array(z.object({ titulo: z.string() })),
  })
  .refine((captura) => captura.tipo !== 'em-grupo' || Boolean(captura.seriesId), {
    message: 'Escolha o grupo.',
    path: ['seriesId'],
  })

export type CapturaInput = z.infer<typeof esquemaCaptura>

/** Títulos dos itens do grupo, sem espaços nas pontas e sem linhas vazias. */
export function itensPreenchidos(itens: { titulo: string }[]) {
  return itens.map((item) => item.titulo.trim()).filter((titulo) => titulo.length > 0)
}

export type AtalhoDeDia = 'hoje' | 'amanha' | 'proxima-semana'

/** Hoje, amanhã e a segunda-feira da próxima semana (a semana do app começa na segunda). */
export function atalhosDeDia(
  hoje: DataLocal,
): { id: AtalhoDeDia; rotulo: string; data: DataLocal }[] {
  return [
    { id: 'hoje', rotulo: 'Hoje', data: hoje },
    { id: 'amanha', rotulo: 'Amanhã', data: somarDias(hoje, 1) },
    {
      id: 'proxima-semana',
      rotulo: 'Próxima semana',
      data: somarDias(inicioDaSemana(hoje), 7),
    },
  ]
}

/** "dd/MM" de uma data local. */
export function diaEMes(data: DataLocal) {
  const [, mes, dia] = data.split('-')
  return `${dia}/${mes}`
}

/** Aviso depois de criar, ex.: "Tarefa criada para 03/11" ou "Grupo criado para 03/11". */
export function textoCapturado(tipo: Exclude<TipoCaptura, 'em-grupo'>, data: DataLocal) {
  return `${tipo === 'tarefa' ? 'Tarefa criada' : 'Grupo criado'} para ${diaEMes(data)}`
}

/** Aviso depois de pôr itens num grupo, ex.: "2 itens adicionados a Casa · 01/11". */
export function textoItensAdicionados(quantidade: number, grupo: string, data: DataLocal) {
  const itens = quantidade === 1 ? '1 item adicionado' : `${quantidade} itens adicionados`
  return `${itens} a ${grupo} · ${diaEMes(data)}`
}
