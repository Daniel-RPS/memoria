import { describe, expect, it } from 'vitest'
import type { Subtask, Task } from '@/db/types'
import {
  agruparSubtarefas,
  diasPendente,
  ordemEntre,
  progressoSubtarefas,
  separarDoDia,
  textoDiasPendente,
  textoProgresso,
} from '@/lib/tarefas'

describe('progressoSubtarefas', () => {
  it('conta concluídas sobre o total', () => {
    const progresso = progressoSubtarefas([
      { concluida: true },
      { concluida: false },
      { concluida: true },
      { concluida: false },
      { concluida: false },
    ])
    expect(progresso).toEqual({ concluidas: 2, total: 5 })
    expect(textoProgresso(progresso!)).toBe('2 de 5')
  })

  it('não mostra progresso para tarefa sem subtarefas', () => {
    expect(progressoSubtarefas([])).toBeNull()
  })
})

describe('agruparSubtarefas', () => {
  it('agrupa por tarefa e ordena cada grupo', () => {
    const sub = (id: string, taskId: string, ordem: number): Subtask => ({
      id,
      taskId,
      ordem,
      titulo: id,
      concluida: false,
      criadoEm: '',
      atualizadoEm: '',
    })
    const grupos = agruparSubtarefas([sub('b', 't1', 2), sub('x', 't2', 1), sub('a', 't1', 1)])
    expect(grupos.get('t1')?.map((item) => item.id)).toEqual(['a', 'b'])
    expect(grupos.get('t2')?.map((item) => item.id)).toEqual(['x'])
  })
})

function tarefa(campos: Partial<Task>): Task {
  return {
    id: crypto.randomUUID(),
    titulo: 'Tarefa',
    data: '2026-10-30',
    dataOriginal: '2026-10-30',
    ordem: 1,
    status: 'pendente',
    criadoEm: '',
    atualizadoEm: '',
    ...campos,
  }
}

describe('diasPendente', () => {
  it('conta a partir de dataOriginal, mesmo depois de a tarefa ser movida', () => {
    const movida = tarefa({ data: '2026-10-30', dataOriginal: '2026-10-27' })
    expect(diasPendente(movida, '2026-10-30')).toBe(3)
  })

  it('não mostra contagem para tarefa criada hoje ou no futuro', () => {
    expect(diasPendente(tarefa({ dataOriginal: '2026-10-30' }), '2026-10-30')).toBeNull()
    expect(diasPendente(tarefa({ dataOriginal: '2026-11-02' }), '2026-10-30')).toBeNull()
  })

  it('não mostra contagem para concluída ou arquivada', () => {
    const antiga = { dataOriginal: '2026-10-01' }
    expect(diasPendente(tarefa({ ...antiga, status: 'concluida' }), '2026-10-30')).toBeNull()
    expect(diasPendente(tarefa({ ...antiga, status: 'arquivada' }), '2026-10-30')).toBeNull()
  })

  it('atravessa a virada de mês e de ano', () => {
    expect(diasPendente(tarefa({ dataOriginal: '2026-12-30' }), '2027-01-02')).toBe(3)
  })

  it('escreve singular e plural', () => {
    expect(textoDiasPendente(1)).toBe('pendente há 1 dia')
    expect(textoDiasPendente(4)).toBe('pendente há 4 dias')
  })
})

describe('ordemEntre', () => {
  it('fica no meio dos vizinhos', () => {
    expect(ordemEntre(1, 2)).toBe(1.5)
  })

  it('vai antes do primeiro e depois do último', () => {
    expect(ordemEntre(undefined, 3)).toBe(2)
    expect(ordemEntre(3, undefined)).toBe(4)
    expect(ordemEntre()).toBe(1)
  })

  it('pede renumeração quando não há mais espaço entre os vizinhos', () => {
    expect(ordemEntre(1, 1 + Number.EPSILON)).toBeNull()
    expect(ordemEntre(2, 2)).toBeNull()
  })
})

describe('separarDoDia', () => {
  it('ordena pendentes por ordem e concluídas pela hora de conclusão, sem arquivadas', () => {
    const { pendentes, concluidas } = separarDoDia([
      tarefa({ id: 'p2', ordem: 2 }),
      tarefa({ id: 'p1', ordem: 1 }),
      tarefa({ id: 'c2', status: 'concluida', concluidaEm: '2026-10-30T15:00:00.000Z' }),
      tarefa({ id: 'c1', status: 'concluida', concluidaEm: '2026-10-30T09:00:00.000Z' }),
      tarefa({ id: 'a', status: 'arquivada' }),
    ])
    expect(pendentes.map((item) => item.id)).toEqual(['p1', 'p2'])
    expect(concluidas.map((item) => item.id)).toEqual(['c1', 'c2'])
  })
})
