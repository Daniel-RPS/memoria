import { describe, expect, it } from 'vitest'
import type { GroupCard, GroupItem, GroupSeries, Task } from '@/db/types'
import {
  buildInProgressSummary,
  montarResumoDeAndamento,
  type ResumoDeAndamento,
} from '@/domain/andamento'

function criarTarefa(parcial: Partial<Task> & Pick<Task, 'id'>): Task {
  return {
    titulo: 'Tarefa teste',
    data: '2026-11-05',
    ordem: 1,
    status: 'pendente',
    dataOriginal: '2026-11-05',
    criadoEm: '',
    atualizadoEm: '',
    ...parcial,
  }
}

function criarItem(parcial: Partial<GroupItem> & Pick<GroupItem, 'id' | 'cardId'>): GroupItem {
  return {
    titulo: 'Item teste',
    ordem: 1,
    status: 'pendente',
    dataOriginal: '2026-11-05',
    cadeiaId: parcial.id,
    criadoEm: '',
    atualizadoEm: '',
    ...parcial,
  }
}

function criarCard(parcial: Partial<GroupCard> & Pick<GroupCard, 'id' | 'seriesId'>): GroupCard {
  return {
    data: '2026-11-05',
    ordem: 1,
    arquivado: false,
    criadoEm: '',
    atualizadoEm: '',
    ...parcial,
  }
}

function criarSerie(
  parcial: Partial<GroupSeries> & Pick<GroupSeries, 'id' | 'titulo'>,
): GroupSeries {
  return {
    criadoEm: '',
    atualizadoEm: '',
    ...parcial,
  }
}

describe('montarResumoDeAndamento (src/domain)', () => {
  it('resumo de andamento vazio → nada (total 0, grupos vazios, soltas 0, diaDestino null)', () => {
    const resumo = montarResumoDeAndamento({
      tarefas: [],
      itens: [],
      cards: [],
      series: [],
      hoje: '2026-11-05',
    })

    expect(resumo).toEqual<ResumoDeAndamento>({
      grupos: [],
      soltas: 0,
      total: 0,
      diaDestino: null,
    })
  })

  it('ignora tarefas ou itens concluídos, transferidos ou com emAndamento falso/indefinido', () => {
    const tarefas = [
      criarTarefa({ id: 't1', emAndamento: false, status: 'pendente' }),
      criarTarefa({ id: 't2', emAndamento: true, status: 'concluida' }),
      criarTarefa({ id: 't3', status: 'pendente' }),
    ]
    const itens = [
      criarItem({ id: 'i1', cardId: 'c1', emAndamento: false, status: 'pendente' }),
      criarItem({ id: 'i2', cardId: 'c1', emAndamento: true, status: 'transferido' }),
      criarItem({ id: 'i3', cardId: 'c1', emAndamento: true, status: 'concluido' }),
    ]
    const cards = [criarCard({ id: 'c1', seriesId: 's1' })]
    const series = [criarSerie({ id: 's1', titulo: 'Grupo 1' })]

    const resumo = montarResumoDeAndamento({
      tarefas,
      itens,
      cards,
      series,
      hoje: '2026-11-05',
    })

    expect(resumo.total).toBe(0)
    expect(resumo.grupos).toEqual([])
    expect(resumo.soltas).toBe(0)
    expect(resumo.diaDestino).toBeNull()
  })

  it('2 itens no mesmo grupo + 1 item em outro grupo + 1 solta → 2 grupos listados com 2 e 1 itens, 1 solta, total 4', () => {
    const series = [
      criarSerie({ id: 's1', titulo: 'Simulador POOSE' }),
      criarSerie({ id: 's2', titulo: 'Casa' }),
    ]
    const cards = [
      criarCard({ id: 'c1', seriesId: 's1', data: '2026-11-05' }),
      criarCard({ id: 'c2', seriesId: 's2', data: '2026-11-05' }),
    ]
    const itens = [
      criarItem({ id: 'i1', cardId: 'c1', emAndamento: true, status: 'pendente' }),
      criarItem({ id: 'i2', cardId: 'c1', emAndamento: true, status: 'pendente' }),
      criarItem({ id: 'i3', cardId: 'c2', emAndamento: true, status: 'pendente' }),
    ]
    const tarefas = [
      criarTarefa({ id: 't1', emAndamento: true, status: 'pendente', data: '2026-11-05' }),
    ]

    const resumo = montarResumoDeAndamento({
      tarefas,
      itens,
      cards,
      series,
      hoje: '2026-11-05',
    })

    expect(resumo.total).toBe(4)
    expect(resumo.soltas).toBe(1)
    expect(resumo.grupos).toHaveLength(2)
    expect(resumo.grupos).toEqual([
      { seriesId: 's1', nome: 'Simulador POOSE', quantidade: 2 },
      { seriesId: 's2', nome: 'Casa', quantidade: 1 },
    ])
    expect(resumo.diaDestino).toBe('2026-11-05')
  })

  it('esconde zeros: somente solta em andamento não lista grupos; somente item não lista soltas', () => {
    // Caso 1: Só solta
    const resumoSolta = montarResumoDeAndamento({
      tarefas: [criarTarefa({ id: 't1', emAndamento: true, status: 'pendente' })],
      itens: [],
      cards: [],
      series: [],
    })
    expect(resumoSolta.total).toBe(1)
    expect(resumoSolta.soltas).toBe(1)
    expect(resumoSolta.grupos).toHaveLength(0)

    // Caso 2: Só grupo
    const resumoGrupo = montarResumoDeAndamento({
      tarefas: [],
      itens: [criarItem({ id: 'i1', cardId: 'c1', emAndamento: true, status: 'pendente' })],
      cards: [criarCard({ id: 'c1', seriesId: 's1' })],
      series: [criarSerie({ id: 's1', titulo: 'Estudos' })],
    })
    expect(resumoGrupo.total).toBe(1)
    expect(resumoGrupo.soltas).toBe(0)
    expect(resumoGrupo.grupos).toEqual([{ seriesId: 's1', nome: 'Estudos', quantidade: 1 }])
  })

  it('determina o diaDestino preferindo hoje se presente ou o dia mais antigo', () => {
    const tarefas = [
      criarTarefa({ id: 't1', emAndamento: true, status: 'pendente', data: '2026-11-02' }),
      criarTarefa({ id: 't2', emAndamento: true, status: 'pendente', data: '2026-11-05' }),
    ]
    const resumoComHoje = montarResumoDeAndamento({
      tarefas,
      itens: [],
      cards: [],
      series: [],
      hoje: '2026-11-05',
    })
    expect(resumoComHoje.diaDestino).toBe('2026-11-05')

    const resumoSemHoje = montarResumoDeAndamento({
      tarefas: [
        criarTarefa({ id: 't1', emAndamento: true, status: 'pendente', data: '2026-11-03' }),
        criarTarefa({ id: 't2', emAndamento: true, status: 'pendente', data: '2026-11-02' }),
      ],
      itens: [],
      cards: [],
      series: [],
      hoje: '2026-11-05',
    })
    expect(resumoSemHoje.diaDestino).toBe('2026-11-02')
  })

  it('funciona também com o alias buildInProgressSummary', () => {
    expect(buildInProgressSummary).toBe(montarResumoDeAndamento)
  })
})
