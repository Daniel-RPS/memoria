import { describe, expect, it } from 'vitest'
import {
  calcularEixosEvolucao,
  calcularSegmentosEvolucao,
  formatarDataTooltipEvolucao,
  formatarDataEixoX,
  gerarAriaLabelEvolucao,
} from './grafico-evolucao-tarefas-calculos'

describe('calcularEixosEvolucao', () => {
  it('se todos os pontos forem 0, teto é 4 e linhas são [0, 1, 2, 3, 4]', () => {
    const eixos = calcularEixosEvolucao([
      { dia: '2026-11-10', total: 0 },
      { dia: '2026-11-11', total: 0 },
    ])
    expect(eixos.tetoY).toBe(4)
    expect(eixos.ticksY).toEqual([0, 1, 2, 3, 4])
  })

  it('arredonda para cima em teto redondo (5, 10, 20, 50, 100...)', () => {
    expect(calcularEixosEvolucao([{ dia: '2026-11-10', total: 3 }]).tetoY).toBe(5)
    expect(calcularEixosEvolucao([{ dia: '2026-11-10', total: 7 }]).tetoY).toBe(10)
    expect(calcularEixosEvolucao([{ dia: '2026-11-10', total: 14 }]).tetoY).toBe(20)
    expect(calcularEixosEvolucao([{ dia: '2026-11-10', total: 22 }]).tetoY).toBe(30)
    expect(calcularEixosEvolucao([{ dia: '2026-11-10', total: 45 }]).tetoY).toBe(50)
    expect(calcularEixosEvolucao([{ dia: '2026-11-10', total: 85 }]).tetoY).toBe(100)
  })
})

describe('calcularSegmentosEvolucao', () => {
  it('separa em segmentos quando há lacuna entre dias consecutivos', () => {
    const pontos = [
      { dia: '2026-10-01', total: 2 },
      { dia: '2026-10-02', total: 3 },
      // lacuna
      { dia: '2026-10-05', total: 5 },
      { dia: '2026-10-06', total: 1 },
    ]
    const segmentos = calcularSegmentosEvolucao(pontos)
    expect(segmentos).toHaveLength(2)
    expect(segmentos[0].map((p) => p.dia)).toEqual(['2026-10-01', '2026-10-02'])
    expect(segmentos[1].map((p) => p.dia)).toEqual(['2026-10-05', '2026-10-06'])
  })
})

describe('formatarDataEixoX', () => {
  it('usa dd/mm se mesmo ano e dd/mm/aa se cruzar anos', () => {
    expect(formatarDataEixoX('2026-11-10', false)).toBe('10/11')
    expect(formatarDataEixoX('2026-11-10', true)).toBe('10/11/26')
  })
})

describe('formatarDataTooltipEvolucao', () => {
  it('formata "sex, 13 nov · 24 tarefas" ou "0 tarefas" ou "1 tarefa"', () => {
    // 2026-11-13 é sexta
    const anoAtual = new Date().getFullYear()
    const d1 = formatarDataTooltipEvolucao('2026-11-13', 24, anoAtual)
    expect(d1).toContain('13 nov · 24 tarefas')

    const d2 = formatarDataTooltipEvolucao('2026-11-13', 1, anoAtual)
    expect(d2).toContain('13 nov · 1 tarefa')

    const d3 = formatarDataTooltipEvolucao('2026-11-13', 0, anoAtual)
    expect(d3).toContain('13 nov · 0 tarefas')
  })
})

describe('gerarAriaLabelEvolucao', () => {
  it('gera texto resumindo período, mínimo e máximo', () => {
    const pontos = [
      { dia: '2026-11-09', total: 8 },
      { dia: '2026-11-12', total: 31 },
      { dia: '2026-11-15', total: 10 },
    ]
    const label = gerarAriaLabelEvolucao(pontos, false)
    expect(label).toContain('Evolução do total de tarefas de 09/11 a 15/11')
    expect(label).toContain('mínimo 8')
    expect(label).toContain('máximo 31 em 12/11')
  })
})
