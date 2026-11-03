import { describe, expect, it } from 'vitest'
import type { GroupItem, Task } from '@/db/types'
import {
  camposDeAndamento,
  comAndamento,
  contarEmAndamento,
  isEmAndamento,
  marcaDe,
  semAndamento,
  textoDoAndamento,
} from '@/lib/andamento'

const base = { criadoEm: '', atualizadoEm: '' }
const tarefa = (campos: Partial<Task> = {}): Task => ({
  ...base,
  id: 't1',
  titulo: 'Estudar',
  data: '2026-11-03',
  ordem: 1,
  status: 'pendente',
  dataOriginal: '2026-11-03',
  ...campos,
})
const item = (campos: Partial<GroupItem> = {}): GroupItem => ({
  ...base,
  id: 'i1',
  cardId: 'c1',
  titulo: 'Junção de mesas',
  ordem: 1,
  status: 'pendente',
  cadeiaId: 'i1',
  dataOriginal: '2026-11-03',
  ...campos,
})

describe('andamento (regras puras)', () => {
  it('marca só o que está pendente', () => {
    const momento = '2026-11-03T10:00:00.000Z'
    expect(comAndamento(tarefa(), momento)).toMatchObject({
      emAndamento: true,
      emAndamentoDesde: momento,
    })
    expect(isEmAndamento(comAndamento(tarefa({ status: 'concluida' }), momento))).toBe(false)
    expect(isEmAndamento(comAndamento(tarefa({ status: 'arquivada' }), momento))).toBe(false)
    expect(isEmAndamento(comAndamento(item({ status: 'transferido' }), momento))).toBe(false)
    expect(isEmAndamento(comAndamento(item({ status: 'concluido' }), momento))).toBe(false)
  })

  it('semAndamento apaga os dois campos sem mexer no resto', () => {
    const marcada = tarefa({ ...camposDeAndamento('2026-11-03T10:00:00.000Z') })
    const limpa = semAndamento(marcada)
    expect(limpa).not.toHaveProperty('emAndamento')
    expect(limpa).not.toHaveProperty('emAndamentoDesde')
    expect(limpa).toMatchObject({ id: 't1', titulo: 'Estudar', status: 'pendente' })
  })

  it('marcaDe leva a marca para um registro novo, ou nada', () => {
    expect(marcaDe(tarefa())).toEqual({})
    expect(marcaDe(tarefa({ emAndamento: false }))).toEqual({})
    expect(marcaDe(item({ emAndamento: true, emAndamentoDesde: 'agora' }))).toEqual({
      emAndamento: true,
      emAndamentoDesde: 'agora',
    })
  })

  it('conta os itens pendentes em andamento do grupo', () => {
    expect(
      contarEmAndamento([
        item({ id: 'a', emAndamento: true }),
        item({ id: 'b', emAndamento: true }),
        item({ id: 'c' }),
        item({ id: 'd', status: 'transferido', emAndamento: true }),
      ]),
    ).toBe(2)
  })

  it('texto do aviso', () => {
    expect(textoDoAndamento(1, true)).toBe('Em andamento')
    expect(textoDoAndamento(1, false)).toBe('Andamento parado')
    expect(textoDoAndamento(3, true)).toBe('3 em andamento')
  })
})
