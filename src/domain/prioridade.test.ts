import { describe, expect, it } from 'vitest'
import {
  camposDePrioridade,
  contarPrioritarios,
  deveMarcarPrioridade,
  isPrioritario,
  podeTerPrioridade,
  prioridadeDe,
  textoDaPrioridade,
} from '@/domain/prioridade'

describe('prioridade (regras puras)', () => {
  it('só o que está pendente pode ter prioridade', () => {
    expect(podeTerPrioridade({ status: 'pendente' })).toBe(true)
    expect(podeTerPrioridade({ status: 'concluida' })).toBe(false)
    expect(podeTerPrioridade({ status: 'concluido' })).toBe(false)
    expect(podeTerPrioridade({ status: 'transferido' })).toBe(false)
    expect(podeTerPrioridade({ status: 'arquivado' })).toBe(false)
  })

  it('a marca leva o momento e só vai para registro novo se houver prioridade', () => {
    const marca = camposDePrioridade('2026-11-05T10:00:00.000Z')
    expect(marca).toEqual({ prioridade: true, prioridadeDesde: '2026-11-05T10:00:00.000Z' })
    expect(isPrioritario(marca)).toBe(true)
    expect(prioridadeDe(marca)).toEqual(marca)
    expect(prioridadeDe({})).toEqual({})
    expect(prioridadeDe({ prioridade: false })).toEqual({})
  })

  it('alternar: marca todos se algum elegível não tem; senão tira de todos', () => {
    const com = { status: 'pendente' as const, prioridade: true }
    const sem = { status: 'pendente' as const }
    expect(deveMarcarPrioridade([com, sem])).toBe(true)
    expect(deveMarcarPrioridade([com, com])).toBe(false)
    // Concluída não conta: não impede de tirar nem obriga a marcar.
    expect(deveMarcarPrioridade([com, { status: 'concluida' as const }])).toBe(false)
    expect(deveMarcarPrioridade([])).toBe(false)
  })

  it('conta só itens pendentes prioritários', () => {
    expect(
      contarPrioritarios([
        { status: 'pendente', prioridade: true },
        { status: 'pendente' },
        { status: 'concluido', prioridade: true },
      ]),
    ).toBe(1)
  })

  it('texto do aviso no singular e no plural', () => {
    expect(textoDaPrioridade(1, true)).toBe('Marcada como prioridade')
    expect(textoDaPrioridade(3, true)).toBe('3 marcadas como prioridade')
    expect(textoDaPrioridade(1, false)).toBe('Prioridade removida')
    expect(textoDaPrioridade(2, false)).toBe('Prioridade removida de 2')
  })
})
