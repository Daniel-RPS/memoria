import { describe, expect, it } from 'vitest'
import type { Subtask } from '@/db/types'
import {
  copiarSubetapas,
  efeitoNoDono,
  proximaOrdemDeSubetapa,
  titulosDoTextoColado,
} from '@/domain/subetapas'

const MOMENTO = '2026-11-05T12:00:00.000Z'

function subetapa(id: string, ordem: number, concluida = false): Subtask {
  return {
    id,
    taskId: 'dono',
    titulo: id,
    concluida,
    ordem,
    criadoEm: MOMENTO,
    atualizadoEm: MOMENTO,
  }
}

const PENDENTE = { isPendente: true, isConcluido: false, concluidaPelasSubetapas: false }
const CONCLUIDO_PELAS_SUBETAPAS = {
  isPendente: false,
  isConcluido: true,
  concluidaPelasSubetapas: true,
}
const CONCLUIDO_DIRETO = { isPendente: false, isConcluido: true, concluidaPelasSubetapas: false }

describe('subetapas (regras puras)', () => {
  it('a próxima ordem vem depois de todas as do dono', () => {
    expect(proximaOrdemDeSubetapa([])).toBe(1)
    expect(proximaOrdemDeSubetapa([{ ordem: 1 }, { ordem: 4.5 }])).toBe(5.5)
  })

  it('copiar leva todas, em ordem, com ids novos e as concluídas ainda marcadas', () => {
    let contador = 0
    const copias = copiarSubetapas(
      [subetapa('c', 3), subetapa('a', 1, true), subetapa('b', 2)],
      'novo-dono',
      () => `copia-${++contador}`,
      MOMENTO,
    )
    expect(
      copias.map(({ id, taskId, titulo, concluida }) => [id, taskId, titulo, concluida]),
    ).toEqual([
      ['copia-1', 'novo-dono', 'a', true],
      ['copia-2', 'novo-dono', 'b', false],
      ['copia-3', 'novo-dono', 'c', false],
    ])
  })

  it('marcar a ÚLTIMA pendente conclui o dono pendente; com pendentes sobrando, não', () => {
    expect(efeitoNoDono(true, [{ concluida: true }, { concluida: true }], PENDENTE)).toBe(
      'concluir',
    )
    expect(efeitoNoDono(true, [{ concluida: true }, { concluida: false }], PENDENTE)).toBe('nada')
    expect(efeitoNoDono(true, [{ concluida: true }], CONCLUIDO_DIRETO)).toBe('nada')
  })

  it('desmarcar reabre só o dono concluído pelas subetapas', () => {
    const subetapas = [{ concluida: true }, { concluida: false }]
    expect(efeitoNoDono(false, subetapas, CONCLUIDO_PELAS_SUBETAPAS)).toBe('reabrir')
    expect(efeitoNoDono(false, subetapas, CONCLUIDO_DIRETO)).toBe('nada')
    expect(efeitoNoDono(false, subetapas, PENDENTE)).toBe('nada')
  })

  it('colar várias linhas: uma subetapa por linha não vazia', () => {
    expect(titulosDoTextoColado('  Caixas\r\n\nFita  \n  \nEtiquetas')).toEqual([
      'Caixas',
      'Fita',
      'Etiquetas',
    ])
  })
})
