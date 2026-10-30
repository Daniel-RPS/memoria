import { describe, expect, it } from 'vitest'
import { destinoDoAdiamento, pendenciasDeOntem, planejarMovimento } from '@/lib/mover'

const HOJE = '2026-10-30'

describe('destinoDoAdiamento', () => {
  it('tarefa de hoje vai para amanhã', () => {
    expect(destinoDoAdiamento(HOJE, HOJE)).toBe('2026-10-31')
  })

  it('tarefa atrasada também vai para amanhã, não para o dia seguinte ao dela', () => {
    expect(destinoDoAdiamento('2026-10-20', HOJE)).toBe('2026-10-31')
  })

  it('tarefa futura vai para o dia seguinte ao dela', () => {
    expect(destinoDoAdiamento('2026-11-05', HOJE)).toBe('2026-11-06')
  })

  it('atravessa a virada de mês e de ano', () => {
    expect(destinoDoAdiamento('2026-12-31', '2026-12-31')).toBe('2027-01-01')
  })
})

describe('planejarMovimento', () => {
  const tarefa = (id: string, data: string, ordem: number, status = 'pendente' as const) => ({
    id,
    data,
    ordem,
    status,
  })

  it('entra no fim do dia de destino mantendo a ordem relativa', () => {
    const movimentos = planejarMovimento(
      [tarefa('b', '2026-10-29', 2), tarefa('c', '2026-10-28', 5), tarefa('a', '2026-10-29', 1)],
      HOJE,
      3,
    )
    expect(movimentos).toEqual([
      { id: 'c', data: HOJE, ordem: 4 },
      { id: 'a', data: HOJE, ordem: 5 },
      { id: 'b', data: HOJE, ordem: 6 },
    ])
  })

  it('ignora arquivadas e as que já estão no destino', () => {
    const movimentos = planejarMovimento(
      [
        tarefa('ja-esta', HOJE, 1),
        { id: 'arquivada', data: '2026-10-29', ordem: 1, status: 'arquivada' },
        tarefa('vai', '2026-10-29', 2),
      ],
      HOJE,
      0,
    )
    expect(movimentos.map((movimento) => movimento.id)).toEqual(['vai'])
  })

  it('move concluídas quando pedido explicitamente', () => {
    const movimentos = planejarMovimento(
      [{ id: 'feita', data: '2026-10-29', ordem: 1, status: 'concluida' }],
      HOJE,
      0,
    )
    expect(movimentos).toHaveLength(1)
  })
})

describe('pendenciasDeOntem', () => {
  it('pega só pendentes exatamente de ontem', () => {
    const resultado = pendenciasDeOntem(
      [
        { id: 'ontem', data: '2026-10-29', status: 'pendente' as const },
        { id: 'ontem-feita', data: '2026-10-29', status: 'concluida' as const },
        { id: 'ontem-arquivada', data: '2026-10-29', status: 'arquivada' as const },
        { id: 'anteontem', data: '2026-10-28', status: 'pendente' as const },
        { id: 'hoje', data: HOJE, status: 'pendente' as const },
      ],
      HOJE,
    )
    expect(resultado.map((tarefa) => tarefa.id)).toEqual(['ontem'])
  })

  it('no dia 1º, ontem é o último dia do mês anterior', () => {
    const resultado = pendenciasDeOntem(
      [{ id: 'x', data: '2026-02-28', status: 'pendente' as const }],
      '2026-03-01',
    )
    expect(resultado).toHaveLength(1)
  })
})
