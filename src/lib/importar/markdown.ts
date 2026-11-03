import {
  rascunhoVazio,
  type GrupoImportado,
  type ProcedimentoImportado,
  type RascunhoDeImportacao,
  type TarefaImportada,
} from '@/lib/importar/rascunho'

/**
 * Texto colado, .txt ou .md. O que o texto vira depende do que o usuário escolheu:
 * - tarefas: cada linha = tarefa; "- [ ]" pendente, "- [x]" concluída; linha com recuo =
 *   subtarefa da de cima; "# Nome" seguido de uma lista = grupo com aqueles itens (a lista
 *   acaba na primeira linha em branco depois dela);
 * - procedimento: "# Título" abre um procedimento; itens da lista (numerados ou não) ou
 *   "## Etapa" viram etapas, e o texto logo abaixo entra na etapa como descrição;
 * - nota: título = "# Título" ou a primeira linha; o resto é o conteúdo.
 * Bloco de código, tabela, imagem e HTML não viram nada: aparecem nos avisos.
 */

export type ConteudoDoTexto = 'tarefas' | 'procedimento' | 'nota'

const ITEM_DE_LISTA = /^(\s*)(?:[-*+]|\d{1,3}[.)])\s+(?:\[([ xX])\]\s*)?(.*)$/
const TITULO = /^(#{1,6})\s+(.*?)\s*#*\s*$/
const SEPARADOR = /^\s*([-*_])(\s*\1){2,}\s*$/
const CERCA_DE_CODIGO = /^\s*(```|~~~)/
const MARCADOR_NO_INICIO = /^\s*(?:[-*+]|\d{1,3}[.)])\s+(?:\[[ xX]\]\s*)?/
const TAMANHO_DO_RESUMO = 40

/** Largura do recuo (tab = 4 espaços), para saber o que é subtarefa. */
function larguraDoRecuo(recuo: string) {
  return recuo.replace(/\t/g, '    ').length
}

function linhasDe(texto: string) {
  return texto.replace(/^﻿/, '').replace(/\r\n?/g, '\n').split('\n')
}

function resumir(linha: string) {
  const limpa = linha.trim()
  return limpa.length > TAMANHO_DO_RESUMO ? `${limpa.slice(0, TAMANHO_DO_RESUMO)}…` : limpa
}

/** Linha que não vira nada: devolve o que ela é (para o aviso) ou `null` se a linha serve. */
function motivoParaIgnorar(linha: string): string | null {
  const limpa = linha.trim()
  if (limpa.startsWith('|')) return 'tabela'
  if (/^!\[.*\]\(.*\)$/.test(limpa)) return 'imagem'
  if (/^<\/?[a-z][^>]*>$/i.test(limpa)) return 'HTML'
  return null
}

/**
 * Percorre as linhas tirando blocos de código, tabelas, imagens (com aviso) e separadores.
 * `aoLer` recebe as linhas que importam (inclusive em branco) com o número da linha (1, 2…).
 */
function percorrer(
  texto: string,
  rascunho: RascunhoDeImportacao,
  aoLer: (linha: string, numero: number) => void,
) {
  let isNoCodigo = false
  linhasDe(texto).forEach((linha, indice) => {
    const numero = indice + 1
    if (CERCA_DE_CODIGO.test(linha)) {
      if (!isNoCodigo) rascunho.avisos.push(`Linha ${numero}: bloco de código ignorado.`)
      isNoCodigo = !isNoCodigo
      return
    }
    if (isNoCodigo || SEPARADOR.test(linha)) return
    const motivo = motivoParaIgnorar(linha)
    if (motivo) {
      rascunho.avisos.push(`Linha ${numero}: ${motivo} ignorada (“${resumir(linha)}”).`)
      return
    }
    aoLer(linha, numero)
  })
}

export function lerTarefasDoMarkdown(texto: string, origem = 'md'): RascunhoDeImportacao {
  const rascunho = rascunhoVazio()
  let grupo: { pronto: GrupoImportado; linha: number } | null = null
  let isListaDoGrupoAcabou = false
  let ultimaTarefa: { tarefa: TarefaImportada; recuo: number } | null = null

  function fecharGrupo() {
    if (grupo && grupo.pronto.itens.length === 0) {
      rascunho.avisos.push(`Linha ${grupo.linha}: “${grupo.pronto.titulo}” não tem lista embaixo.`)
    } else if (grupo) {
      rascunho.grupos.push(grupo.pronto)
    }
    grupo = null
    isListaDoGrupoAcabou = false
  }

  percorrer(texto, rascunho, (linha, numero) => {
    if (linha.trim() === '') {
      if (grupo && grupo.pronto.itens.length > 0) isListaDoGrupoAcabou = true
      return
    }
    const titulo = TITULO.exec(linha)
    if (titulo) {
      fecharGrupo()
      ultimaTarefa = null
      grupo = {
        pronto: { chave: `${origem}:g${numero}`, titulo: titulo[2], itens: [] },
        linha: numero,
      }
      return
    }
    if (grupo && isListaDoGrupoAcabou) fecharGrupo()

    const item = ITEM_DE_LISTA.exec(linha)
    const recuo = larguraDoRecuo(item ? item[1] : (/^\s*/.exec(linha)?.[0] ?? ''))
    const textoDaLinha = (item ? item[3] : linha).trim()
    const isMarcada = item?.[2] !== undefined && item[2] !== ' '
    if (!textoDaLinha) {
      rascunho.avisos.push(`Linha ${numero}: item sem texto.`)
      return
    }

    if (grupo) {
      grupo.pronto.itens.push({ titulo: textoDaLinha, isConcluido: isMarcada })
      return
    }
    if (ultimaTarefa && recuo > ultimaTarefa.recuo) {
      ultimaTarefa.tarefa.subtarefas.push({ titulo: textoDaLinha, isConcluida: isMarcada })
      return
    }
    const tarefa: TarefaImportada = {
      chave: `${origem}:t${numero}`,
      titulo: textoDaLinha,
      isConcluida: isMarcada,
      subtarefas: [],
    }
    rascunho.tarefas.push(tarefa)
    ultimaTarefa = { tarefa, recuo }
  })
  fecharGrupo()
  return rascunho
}

export function lerProcedimentosDoMarkdown(texto: string, origem = 'md'): RascunhoDeImportacao {
  const rascunho = rascunhoVazio()
  let atual: ProcedimentoImportado | null = null
  /** A etapa que recebe o texto de baixo (descrição); -1 = nenhuma ainda. */
  let etapaAberta = -1

  function abrir(titulo: string, numero: number) {
    const procedimento: ProcedimentoImportado = {
      chave: `${origem}:p${numero}`,
      titulo,
      etapas: [],
    }
    rascunho.procedimentos.push(procedimento)
    etapaAberta = -1
    return procedimento
  }

  percorrer(texto, rascunho, (linha, numero) => {
    if (linha.trim() === '') return
    const titulo = TITULO.exec(linha)
    if (titulo && titulo[1].length === 1) {
      atual = abrir(titulo[2], numero)
      return
    }
    // Sem "# Título", a primeira linha com texto é o título.
    if (!atual) {
      atual = abrir((titulo?.[2] ?? linha.replace(MARCADOR_NO_INICIO, '')).trim(), numero)
      return
    }
    const procedimento: ProcedimentoImportado = atual
    const item = ITEM_DE_LISTA.exec(linha)
    const isNovaEtapa = titulo !== null || (item !== null && larguraDoRecuo(item[1]) === 0)
    if (isNovaEtapa) {
      const textoDaEtapa = (titulo ? titulo[2] : (item?.[3] ?? '')).trim()
      if (!textoDaEtapa) return
      procedimento.etapas.push(textoDaEtapa)
      etapaAberta = procedimento.etapas.length - 1
      return
    }
    if (etapaAberta < 0) {
      rascunho.avisos.push(
        `Linha ${numero}: texto antes da primeira etapa de “${procedimento.titulo}” ficou de fora.`,
      )
      return
    }
    procedimento.etapas[etapaAberta] += `\n${(item ? item[3] : linha).trim()}`
  })
  return rascunho
}

export function lerNotaDoMarkdown(texto: string, origem = 'md'): RascunhoDeImportacao {
  const rascunho = rascunhoVazio()
  const linhas = linhasDe(texto)
  const primeira = linhas.findIndex((linha) => linha.trim() !== '')
  if (primeira < 0) {
    rascunho.avisos.push('O texto está vazio.')
    return rascunho
  }
  const titulo = TITULO.exec(linhas[primeira])?.[2] ?? linhas[primeira].trim()
  const conteudo = linhas
    .slice(primeira + 1)
    .join('\n')
    .trim()
  rascunho.notas.push({ chave: `${origem}:n`, titulo, conteudo, anexos: [] })
  return rascunho
}

/** O leitor certo para o que o usuário disse que o texto é. */
export function lerMarkdown(texto: string, conteudo: ConteudoDoTexto, origem = 'md') {
  if (conteudo === 'procedimento') return lerProcedimentosDoMarkdown(texto, origem)
  if (conteudo === 'nota') return lerNotaDoMarkdown(texto, origem)
  return lerTarefasDoMarkdown(texto, origem)
}
