import { describe, expect, it } from 'vitest'
import {
  diaLocalDoMomento,
  filtrarPorData,
  intervaloDoFiltro,
  isNoFiltro,
  lerFiltroDeData,
  rotuloDoFiltro,
  type FiltroDeData,
} from '@/lib/filtro-de-data'

const HOJE = '2026-11-02'
/** Momento local de São Paulo gravado como o app grava (ISO em UTC). */
const momento = (local: string) => new Date(`${local}-03:00`).toISOString()

describe('intervaloDoFiltro', () => {
  it('qualquer dia não tem intervalo', () => {
    expect(intervaloDoFiltro({ tipo: 'qualquer' }, HOJE)).toBeNull()
  })

  it.each<[FiltroDeData, string, string]>([
    [{ tipo: 'hoje' }, '2026-11-02', '2026-11-02'],
    [{ tipo: 'ontem' }, '2026-11-01', '2026-11-01'],
    [{ tipo: 'ultimos7' }, '2026-10-27', '2026-11-02'],
    [{ tipo: 'mes' }, '2026-11-01', '2026-11-02'],
    [{ tipo: 'periodo', inicio: '2026-10-30', fim: '2026-10-30' }, '2026-10-30', '2026-10-30'],
    [{ tipo: 'periodo', inicio: '2026-10-28', fim: '2026-10-30' }, '2026-10-28', '2026-10-30'],
  ])('%o vai de %s a %s', (filtro, inicio, fim) => {
    expect(intervaloDoFiltro(filtro, HOJE)).toEqual({ inicio, fim })
  })

  it('intervalo escolhido ao contrário é invertido', () => {
    expect(
      intervaloDoFiltro({ tipo: 'periodo', inicio: '2026-10-30', fim: '2026-10-28' }, HOJE),
    ).toEqual({ inicio: '2026-10-28', fim: '2026-10-30' })
  })

  it('"Ontem" no dia 1º volta para o mês anterior', () => {
    expect(intervaloDoFiltro({ tipo: 'ontem' }, '2026-03-01')).toEqual({
      inicio: '2026-02-28',
      fim: '2026-02-28',
    })
  })
})

describe('isNoFiltro na virada do dia (fuso local)', () => {
  it('23:59 de ontem é ontem, mesmo já sendo o dia seguinte em UTC', () => {
    const quaseMeiaNoite = momento('2026-11-01T23:59:00')
    expect(quaseMeiaNoite.startsWith('2026-11-02')).toBe(true) // em UTC já é dia 2
    expect(diaLocalDoMomento(quaseMeiaNoite)).toBe('2026-11-01')
    expect(isNoFiltro(quaseMeiaNoite, { tipo: 'ontem' }, HOJE)).toBe(true)
    expect(isNoFiltro(quaseMeiaNoite, { tipo: 'hoje' }, HOJE)).toBe(false)
  })

  it('00:01 de hoje é hoje', () => {
    const madrugada = momento('2026-11-02T00:01:00')
    expect(isNoFiltro(madrugada, { tipo: 'hoje' }, HOJE)).toBe(true)
    expect(isNoFiltro(madrugada, { tipo: 'ontem' }, HOJE)).toBe(false)
  })

  it('"Últimos 7 dias" inclui o 7º dia para trás e não o 8º', () => {
    expect(isNoFiltro(momento('2026-10-27T00:01:00'), { tipo: 'ultimos7' }, HOJE)).toBe(true)
    expect(isNoFiltro(momento('2026-10-26T23:59:00'), { tipo: 'ultimos7' }, HOJE)).toBe(false)
  })

  it('"Este mês" começa no dia 1º local', () => {
    expect(isNoFiltro(momento('2026-11-01T00:01:00'), { tipo: 'mes' }, HOJE)).toBe(true)
    expect(isNoFiltro(momento('2026-10-31T23:59:00'), { tipo: 'mes' }, HOJE)).toBe(false)
  })

  it('data única e intervalo incluem as pontas', () => {
    const dia: FiltroDeData = { tipo: 'periodo', inicio: '2026-10-30', fim: '2026-10-30' }
    expect(isNoFiltro(momento('2026-10-30T00:00:00'), dia, HOJE)).toBe(true)
    expect(isNoFiltro(momento('2026-10-30T23:59:59'), dia, HOJE)).toBe(true)
    expect(isNoFiltro(momento('2026-10-31T00:00:00'), dia, HOJE)).toBe(false)
    const periodo: FiltroDeData = { tipo: 'periodo', inicio: '2026-10-28', fim: '2026-10-30' }
    expect(isNoFiltro(momento('2026-10-28T08:00:00'), periodo, HOJE)).toBe(true)
    expect(isNoFiltro(momento('2026-10-27T23:59:00'), periodo, HOJE)).toBe(false)
  })

  it('momento inválido só passa em "qualquer dia"', () => {
    expect(isNoFiltro('', { tipo: 'qualquer' }, HOJE)).toBe(true)
    expect(isNoFiltro('', { tipo: 'hoje' }, HOJE)).toBe(false)
  })
})

describe('filtrarPorData', () => {
  it('mantém a ordem e devolve a mesma lista sem filtro', () => {
    const itens = [
      { id: 'a', em: momento('2026-11-02T09:00:00') },
      { id: 'b', em: momento('2026-10-01T09:00:00') },
      { id: 'c', em: momento('2026-11-02T08:00:00') },
    ]
    expect(filtrarPorData(itens, (item) => item.em, { tipo: 'qualquer' }, HOJE)).toBe(itens)
    expect(
      filtrarPorData(itens, (item) => item.em, { tipo: 'hoje' }, HOJE).map((item) => item.id),
    ).toEqual(['a', 'c'])
  })
})

describe('rotuloDoFiltro', () => {
  it('atalhos, dia único, intervalo e outro ano', () => {
    expect(rotuloDoFiltro({ tipo: 'qualquer' }, HOJE)).toBeUndefined()
    expect(rotuloDoFiltro({ tipo: 'ultimos7' }, HOJE)).toBe('Últimos 7 dias')
    expect(rotuloDoFiltro({ tipo: 'periodo', inicio: '2026-10-30', fim: '2026-10-30' }, HOJE)).toBe(
      '30/10',
    )
    expect(rotuloDoFiltro({ tipo: 'periodo', inicio: '2026-10-28', fim: '2026-11-02' }, HOJE)).toBe(
      '28/10 – 02/11',
    )
    expect(rotuloDoFiltro({ tipo: 'periodo', inicio: '2025-10-30', fim: '2025-10-30' }, HOJE)).toBe(
      '30/10/2025',
    )
  })
})

describe('lerFiltroDeData', () => {
  const atalhos = ['hoje', 'ontem', 'ultimos7'] as const

  it('lê o que foi gravado', () => {
    expect(lerFiltroDeData('{"tipo":"hoje"}', atalhos)).toEqual({ tipo: 'hoje' })
    expect(
      lerFiltroDeData('{"tipo":"periodo","inicio":"2026-10-28","fim":"2026-10-30"}', atalhos),
    ).toEqual({ tipo: 'periodo', inicio: '2026-10-28', fim: '2026-10-30' })
  })

  it('inválido, ausente ou fora das opções da tela vira qualquer dia', () => {
    expect(lerFiltroDeData(null, atalhos)).toEqual({ tipo: 'qualquer' })
    expect(lerFiltroDeData('{quebrado', atalhos)).toEqual({ tipo: 'qualquer' })
    expect(lerFiltroDeData('{"tipo":"mes"}', atalhos)).toEqual({ tipo: 'qualquer' })
    expect(
      lerFiltroDeData('{"tipo":"periodo","inicio":"2026-02-30","fim":"2026-03-01"}', atalhos),
    ).toEqual({ tipo: 'qualquer' })
  })
})
