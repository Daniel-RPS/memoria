import { describe, expect, it } from 'vitest'
import {
  camposDeHorario,
  horarioDe,
  isHorarioValido,
  normalizarHorario,
  removerHorarioDe,
} from '@/domain/horario'

describe('horário: normalizar o que foi digitado', () => {
  it.each([
    ['930', '09:30'],
    ['9', '09:00'],
    ['14h', '14:00'],
    ['14h30', '14:30'],
    ['0930', '09:30'],
    ['14:00', '14:00'],
    ['9:5', '09:05'],
    ['0', '00:00'],
    ['2359', '23:59'],
    [' 12:00 ', '12:00'],
  ])('"%s" vira %s', (texto, esperado) => {
    expect(normalizarHorario(texto)).toBe(esperado)
  })

  it.each(['', '24', '2400', '960', '25:00', '12:60', 'abc', '1:2:3', '12345', '-1'])(
    '"%s" é inválido',
    (texto) => {
      expect(normalizarHorario(texto)).toBeUndefined()
    },
  )

  it('valida o formato gravado e recusa gravar horário inválido', () => {
    expect(isHorarioValido('09:00')).toBe(true)
    expect(isHorarioValido('9:00')).toBe(false)
    expect(isHorarioValido('23:60')).toBe(false)
    expect(camposDeHorario('08:15')).toEqual({ horario: '08:15' })
    expect(camposDeHorario(undefined)).toEqual({ horario: undefined })
    expect(() => camposDeHorario('8')).toThrow()
  })

  it('leva o horário para o registro novo e remove sem deixar o campo', () => {
    expect(horarioDe({ horario: '12:00' })).toEqual({ horario: '12:00' })
    expect(horarioDe({})).toEqual({})
    expect('horario' in removerHorarioDe({ id: 'a', horario: '12:00' })).toBe(false)
  })
})
