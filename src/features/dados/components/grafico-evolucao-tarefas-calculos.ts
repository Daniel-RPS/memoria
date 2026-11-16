import { deDataLocal, diasEntre } from '@/lib/datas'
import type { PontoEvolucaoPorDia } from '@/domain/visaoGeral'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export interface EscalaEvolucao {
  tetoY: number
  ticksY: number[]
}

export interface RotuloX {
  indice: number
  dia: string
  texto: string
  x: number
}

/**
 * Calcula o teto do eixo Y (arredondado para cima: 5, 10, 15, 20, 30, 40, 50, 100...)
 * e 3 a 5 linhas de grade com valores inteiros.
 * Se todos os dias forem 0, eixo de 0 a 4 com ticks [0, 1, 2, 3, 4].
 */
export function calcularEixosEvolucao(pontos: PontoEvolucaoPorDia[]): EscalaEvolucao {
  const max = pontos.length > 0 ? Math.max(...pontos.map((p) => p.total)) : 0
  if (max === 0) {
    return {
      tetoY: 4,
      ticksY: [0, 1, 2, 3, 4],
    }
  }

  let tetoY = 5
  if (max <= 5) {
    tetoY = 5
  } else if (max <= 10) {
    tetoY = 10
  } else if (max <= 20) {
    tetoY = 20
  } else if (max <= 30) {
    tetoY = 30
  } else if (max <= 50) {
    tetoY = 50
  } else if (max <= 100) {
    tetoY = 100
  } else {
    // Para valores maiores (100+), arredonda para múltiplo de 50 ou 100
    const magnitude = 10 ** Math.floor(Math.log10(max))
    const passo = magnitude >= 100 ? magnitude / 2 : magnitude
    tetoY = Math.ceil(max / passo) * passo
  }

  // Define 3 a 5 ticks igualmente espaçados com inteiros
  const qtdIntervalos = tetoY % 4 === 0 ? 4 : tetoY % 5 === 0 ? 5 : tetoY % 3 === 0 ? 3 : 4
  const passo = tetoY / qtdIntervalos
  const ticksY: number[] = []
  for (let i = 0; i <= qtdIntervalos; i++) {
    ticksY.push(Math.round(i * passo))
  }

  return {
    tetoY,
    ticksY,
  }
}

/**
 * Agrupa pontos contínuos em segmentos.
 * Se houver um salto > 1 dia entre dois pontos adjacentes, quebra o segmento.
 */
export function calcularSegmentosEvolucao(
  pontos: PontoEvolucaoPorDia[],
): PontoEvolucaoPorDia[][] {
  if (pontos.length === 0) return []
  const segmentos: PontoEvolucaoPorDia[][] = []
  let segmentoAtual: PontoEvolucaoPorDia[] = [pontos[0]]

  for (let i = 1; i < pontos.length; i++) {
    const anterior = pontos[i - 1]
    const atual = pontos[i]
    if (diasEntre(anterior.dia, atual.dia) === 1) {
      segmentoAtual.push(atual)
    } else {
      segmentos.push(segmentoAtual)
      segmentoAtual = [atual]
    }
  }
  segmentos.push(segmentoAtual)
  return segmentos
}

/**
 * Formata a data para o eixo X: "dd/mm" ou "dd/mm/aa" se cruzar anos.
 */
export function formatarDataEixoX(dia: string, cruzaAnos: boolean): string {
  const d = deDataLocal(dia)
  return cruzaAnos ? format(d, 'dd/MM/yy') : format(d, 'dd/MM')
}

/**
 * Calcula os rótulos do eixo X:
 * Até 7 dias, um por dia.
 * Acima disso, no máximo ~6 rótulos bem distribuídos, sempre incluindo o primeiro e o último dia.
 */
export function calcularRotulosX(
  pontos: PontoEvolucaoPorDia[],
  larguraGrafico: number,
  paddingEsquerda: number,
  cruzaAnos: boolean,
): RotuloX[] {
  const n = pontos.length
  if (n === 0) return []

  const xPorIndice = (idx: number) => {
    if (n === 1) return paddingEsquerda + larguraGrafico / 2
    return paddingEsquerda + (idx / (n - 1)) * larguraGrafico
  }

  if (n <= 7) {
    return pontos.map((p, idx) => ({
      indice: idx,
      dia: p.dia,
      texto: formatarDataEixoX(p.dia, cruzaAnos),
      x: xPorIndice(idx),
    }))
  }

  // Acima de 7 dias: até ~6 rótulos distribuídos uniformemente incluindo 0 e n - 1
  const maxRotulos = Math.min(6, n)
  const indicesEscolhidos = new Set<number>()
  indicesEscolhidos.add(0)
  indicesEscolhidos.add(n - 1)

  const passos = maxRotulos - 1
  for (let i = 1; i < passos; i++) {
    const idx = Math.round((i * (n - 1)) / passos)
    indicesEscolhidos.add(idx)
  }

  const indicesOrdenados = Array.from(indicesEscolhidos).sort((a, b) => a - b)
  return indicesOrdenados.map((idx) => ({
    indice: idx,
    dia: pontos[idx].dia,
    texto: formatarDataEixoX(pontos[idx].dia, cruzaAnos),
    x: xPorIndice(idx),
  }))
}

/**
 * Formata tooltip: "sex, 13 nov · 24 tarefas" ("1 tarefa", "0 tarefas"; ano se não for o atual)
 */
export function formatarDataTooltipEvolucao(
  dia: string,
  total: number,
  anoReferencia: number = new Date().getFullYear(),
): string {
  const data = deDataLocal(dia)
  const ano = data.getFullYear()
  const formatoBase = ano === anoReferencia ? "EEE, d 'de' MMM" : "EEE, d 'de' MMM 'de' yyyy"
  const dataFormatada = format(data, formatoBase, { locale: ptBR })
    .replace(' de ', ' ')
    .replace(' de ', ', ')
  const sulfixo = total === 1 ? '1 tarefa' : `${total} tarefas`
  return `${dataFormatada} · ${sulfixo}`
}

/**
 * Gera aria-label acessível resumindo o gráfico
 */
export function gerarAriaLabelEvolucao(
  pontos: PontoEvolucaoPorDia[],
  cruzaAnos: boolean,
): string {
  if (pontos.length === 0) return 'Evolução das tarefas: nenhuma tarefa'
  const primeiroDia = formatarDataEixoX(pontos[0].dia, cruzaAnos)
  const ultimoDia = formatarDataEixoX(pontos[pontos.length - 1].dia, cruzaAnos)

  let min = pontos[0].total
  let max = pontos[0].total
  let diaMax = pontos[0].dia

  for (const p of pontos) {
    if (p.total < min) min = p.total
    if (p.total >= max) {
      max = p.total
      diaMax = p.dia
    }
  }

  const diaMaxFormatado = formatarDataEixoX(diaMax, cruzaAnos)
  return `Evolução do total de tarefas de ${primeiroDia} a ${ultimoDia}: mínimo ${min}, máximo ${max} em ${diaMaxFormatado}`
}
