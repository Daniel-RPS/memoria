import { describe, expect, it } from 'vitest'
import {
  iniciaisDosDias,
  inicioDoMes,
  intensidade,
  mesesDoAno,
  nomeDoMes,
  resumirPorDia,
  semanasDoMes,
  somarMeses,
} from '@/lib/calendario'

describe('semanasDoMes', () => {
  it('cobre outubro de 2026 de segunda a domingo, com os dias vizinhos', () => {
    const semanas = semanasDoMes('2026-10-15')
    expect(semanas).toHaveLength(5)
    expect(semanas[0][0]).toBe('2026-09-28')
    expect(semanas[0][3]).toBe('2026-10-01')
    expect(semanas.at(-1)!.at(-1)).toBe('2026-11-01')
    expect(semanas.every((semana) => semana.length === 7)).toBe(true)
  })

  it('fevereiro que começa na segunda cabe em 4 semanas', () => {
    // 1º de fevereiro de 2027 é segunda-feira e o mês tem 28 dias.
    const semanas = semanasDoMes('2027-02-10')
    expect(semanas).toHaveLength(4)
    expect(semanas[0][0]).toBe('2027-02-01')
    expect(semanas[3][6]).toBe('2027-02-28')
  })

  it('mês longo que começa no domingo precisa de 6 semanas', () => {
    // 1º de agosto de 2027 é domingo.
    expect(semanasDoMes('2027-08-20')).toHaveLength(6)
  })
})

describe('navegação entre meses', () => {
  it('soma meses atravessando o ano e sem pular fevereiro', () => {
    expect(somarMeses('2026-01-31', 1)).toBe('2026-02-01')
    expect(somarMeses('2026-12-15', 1)).toBe('2027-01-01')
    expect(somarMeses('2026-01-10', -1)).toBe('2025-12-01')
    expect(inicioDoMes('2026-10-30')).toBe('2026-10-01')
  })

  it('lista os 12 meses do ano e nomeia em pt-BR', () => {
    expect(mesesDoAno(2026)).toHaveLength(12)
    expect(mesesDoAno(2026)[11]).toBe('2026-12-01')
    expect(nomeDoMes('2026-10-01')).toBe('outubro de 2026')
    expect(iniciaisDosDias()[0].completa).toBe('segunda-feira')
  })
})

describe('resumirPorDia', () => {
  it('conta pendentes, concluídas e atrasadas, ignorando arquivadas', () => {
    const resumo = resumirPorDia(
      [
        { data: '2026-10-29', status: 'pendente' },
        { data: '2026-10-29', status: 'concluida' },
        { data: '2026-10-30', status: 'pendente' },
        { data: '2026-10-30', status: 'arquivada' },
      ],
      '2026-10-30',
    )
    expect(resumo.get('2026-10-29')).toEqual({ pendentes: 1, concluidas: 1, atrasadas: 1 })
    expect(resumo.get('2026-10-30')).toEqual({ pendentes: 1, concluidas: 0, atrasadas: 0 })
  })

  it('agrupa a quantidade em quatro tons', () => {
    expect([0, 1, 2, 3, 4, 9].map(intensidade)).toEqual([0, 1, 2, 2, 3, 3])
  })
})
