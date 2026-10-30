import { describe, expect, it } from 'vitest'
import { deDataLocal, diasEntre, hoje, paraDataLocal, somarDias } from '@/lib/datas'

describe('datas locais', () => {
  it('converte ida e volta sem deslocar o dia', () => {
    expect(paraDataLocal(deDataLocal('2026-10-30'))).toBe('2026-10-30')
  })

  it('usa a data local mesmo perto da meia-noite', () => {
    expect(hoje(new Date(2026, 9, 30, 23, 59))).toBe('2026-10-30')
    expect(hoje(new Date(2026, 9, 31, 0, 1))).toBe('2026-10-31')
  })

  it('soma dias atravessando mês e ano', () => {
    expect(somarDias('2026-10-31', 1)).toBe('2026-11-01')
    expect(somarDias('2026-12-31', 1)).toBe('2027-01-01')
    expect(somarDias('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('conta dias entre datas', () => {
    expect(diasEntre('2026-10-28', '2026-10-30')).toBe(2)
    expect(diasEntre('2026-10-30', '2026-10-30')).toBe(0)
  })
})
