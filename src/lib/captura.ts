import { z } from 'zod'
import type { DataLocal } from '@/db/types'
import { isDataLocalValida, somarDias } from '@/lib/datas'
import { esquemaTituloTarefa } from '@/lib/esquemas'

/** Regras da captura rápida do Início (o que criar, onde e quando). */

/** Tarefa solta, grupo novo ou item(ns) num grupo que já existe ("Em grupo…"). */
export type TipoCaptura = 'tarefa' | 'grupo' | 'em-grupo'

/**
 * O que cada linha do campo vira: a 1ª é o título (da tarefa, do grupo novo ou o 1º item em
 * "Em grupo…"); as seguintes viram a anotação da tarefa ou itens do grupo, um por linha.
 * Linhas em branco não contam (na anotação, só as das pontas saem).
 */
export function dividirTexto(tipo: TipoCaptura, texto: string) {
  const linhas = texto.split(/\r?\n/)
  const primeira = linhas.findIndex((linha) => linha.trim() !== '')
  const titulo = primeira === -1 ? '' : linhas[primeira].trim()
  const resto = primeira === -1 ? [] : linhas.slice(primeira + 1)
  if (tipo === 'tarefa') return { titulo, itens: [], anotacao: resto.join('\n').trim() }
  return {
    titulo,
    itens: itensPreenchidos(resto.map((linha) => ({ titulo: linha }))),
    anotacao: '',
  }
}

export const esquemaCaptura = z
  .object({
    /** Tudo o que foi digitado; `dividirTexto` separa título, anotação e itens. */
    texto: z.string(),
    tipo: z.enum(['tarefa', 'grupo', 'em-grupo']),
    categoryId: z.string().optional(),
    subcategoryId: z.string().optional(),
    /** Série escolhida em "Em grupo…". */
    seriesId: z.string().optional(),
    data: z.string().refine(isDataLocalValida, 'Escolha um dia.'),
  })
  .superRefine((captura, contexto) => {
    const { titulo, itens } = dividirTexto(captura.tipo, captura.texto)
    // Em "Em grupo…" o título já é o item 1; no grupo novo os itens começam no 1.
    const primeiroItem = captura.tipo === 'em-grupo' ? 2 : 1
    const linhas = [titulo, ...itens]
    for (const [indice, linha] of linhas.entries()) {
      const resultado = esquemaTituloTarefa.safeParse(linha)
      if (resultado.success) continue
      const mensagem = resultado.error.issues[0].message
      contexto.addIssue({
        code: 'custom',
        path: ['texto'],
        message: indice === 0 ? mensagem : `Item ${indice - 1 + primeiroItem}: ${mensagem}`,
      })
      break
    }
    if (captura.tipo === 'em-grupo' && !captura.seriesId) {
      contexto.addIssue({ code: 'custom', path: ['seriesId'], message: 'Escolha o grupo.' })
    }
  })

export type CapturaInput = z.infer<typeof esquemaCaptura>

/** Títulos dos itens do grupo, sem espaços nas pontas e sem linhas vazias. */
export function itensPreenchidos(itens: { titulo: string }[]) {
  return itens.map((item) => item.titulo.trim()).filter((titulo) => titulo.length > 0)
}

export type AtalhoDeDia = 'hoje' | 'amanha'

/** Hoje e amanhã; outro dia sai do calendário ("Escolher data…"). */
export function atalhosDeDia(
  hoje: DataLocal,
): { id: AtalhoDeDia; rotulo: string; data: DataLocal }[] {
  return [
    { id: 'hoje', rotulo: 'Hoje', data: hoje },
    { id: 'amanha', rotulo: 'Amanhã', data: somarDias(hoje, 1) },
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
