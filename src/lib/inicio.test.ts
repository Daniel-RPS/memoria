import { describe, expect, it } from 'vitest'
import type { GroupCard, GroupItem, GroupSeries, Task } from '@/db/types'
import { filtrarSeries, montarGrupos, ordenarParaEscolher } from '@/lib/grupos'
import { contarProximosDias, montarAtrasadas, textoHaDias } from '@/lib/inicio'

const HOJE = '2026-11-02'

function tarefa(dados: Partial<Task> & Pick<Task, 'id' | 'data'>): Task {
  return {
    titulo: dados.id,
    ordem: 1,
    status: 'pendente',
    dataOriginal: dados.data,
    criadoEm: '',
    atualizadoEm: '',
    ...dados,
  }
}

const SERIE: GroupSeries = { id: 's', titulo: 'Casa', criadoEm: '', atualizadoEm: '' }

function card(id: string, data: string): GroupCard {
  return { id, seriesId: 's', data, ordem: 1, arquivado: false, criadoEm: '', atualizadoEm: '' }
}

function item(
  id: string,
  cardId: string,
  status: GroupItem['status'],
  dataOriginal: string,
): GroupItem {
  return { id, cardId, titulo: id, ordem: 1, status, dataOriginal, criadoEm: '', atualizadoEm: '' }
}

describe('Atrasadas', () => {
  it('tarefas soltas e cards com pendentes de dias passados, da mais atrasada à mais recente', () => {
    const tarefas = [
      tarefa({ id: 'ontem', data: '2026-11-01' }),
      tarefa({ id: 'movida', data: '2026-10-31', dataOriginal: '2026-10-20' }),
      tarefa({ id: 'feita', data: '2026-10-30', status: 'concluida' }),
      tarefa({ id: 'hoje', data: HOJE }),
    ]
    const grupos = montarGrupos(
      [card('c1', '2026-10-29'), card('c2', '2026-10-28')],
      [SERIE],
      [
        item('i1', 'c1', 'pendente', '2026-10-27'),
        item('i2', 'c1', 'pendente', '2026-10-29'),
        item('i3', 'c2', 'concluido', '2026-10-28'),
      ],
    )

    const atrasadas = montarAtrasadas(tarefas, grupos, HOJE)

    expect(
      atrasadas.map((atrasada) =>
        atrasada.tipo === 'tarefa'
          ? `${atrasada.tarefa.id}:${atrasada.dias}`
          : `${atrasada.grupo.card.id}:${atrasada.dias}:${atrasada.pendentes}`,
      ),
    ).toEqual(['movida:13', 'c1:6:2', 'ontem:1'])
    expect(textoHaDias(1)).toBe('há 1 dia')
    expect(textoHaDias(6)).toBe('há 6 dias')
  })
})

describe('Próximos 7 dias', () => {
  it('conta pendentes soltos e itens de grupo por dia, com zero nos dias vazios', () => {
    const tarefas = [
      tarefa({ id: 'a', data: '2026-11-03' }),
      tarefa({ id: 'b', data: '2026-11-03', status: 'concluida' }),
      tarefa({ id: 'c', data: '2026-11-09' }),
    ]
    const grupos = montarGrupos(
      [card('c1', '2026-11-04')],
      [SERIE],
      [item('i1', 'c1', 'pendente', '2026-11-04'), item('i2', 'c1', 'transferido', '2026-11-04')],
    )

    expect(contarProximosDias(tarefas, grupos, HOJE, 7)).toEqual([
      { data: '2026-11-03', pendentes: 1 },
      { data: '2026-11-04', pendentes: 1 },
      { data: '2026-11-05', pendentes: 0 },
      { data: '2026-11-06', pendentes: 0 },
      { data: '2026-11-07', pendentes: 0 },
      { data: '2026-11-08', pendentes: 0 },
      { data: '2026-11-09', pendentes: 1 },
    ])
  })
})

describe('Em grupo…: escolher o grupo', () => {
  function serie(id: string, titulo: string, atualizadoEm: string): GroupSeries {
    return { id, titulo, criadoEm: '', atualizadoEm }
  }

  const series = [
    serie('casa', 'Casa', '2026-10-01T10:00:00Z'),
    serie('mercado', 'Mercado', '2026-10-05T10:00:00Z'),
    serie('estudo', 'Estudo', '2026-10-01T10:00:00Z'),
  ]
  const cards = [
    { ...card('c-casa', HOJE), seriesId: 'casa', atualizadoEm: '2026-10-20T10:00:00Z' },
    { ...card('c-merc', '2026-11-01'), seriesId: 'mercado', atualizadoEm: '2026-10-06T10:00:00Z' },
    {
      ...card('c-est', HOJE),
      seriesId: 'estudo',
      arquivado: true,
      atualizadoEm: '2026-10-02T10:00:00Z',
    },
  ]
  const itens = [{ cardId: 'c-merc', atualizadoEm: '2026-10-30T10:00:00Z' }]

  it('usados recentemente primeiro (card ou item mexido por último) e card visível no dia', () => {
    const lista = ordenarParaEscolher(series, cards, itens, HOJE)
    expect(lista.map(({ serie, temCardNoDia }) => `${serie.titulo}:${temCardNoDia}`)).toEqual([
      'Mercado:false',
      'Casa:true',
      'Estudo:false',
    ])
  })

  it('busca sem diferenciar acento e maiúscula', () => {
    const lista = ordenarParaEscolher(series, cards, itens, HOJE)
    expect(filtrarSeries(lista, 'MERC').map(({ serie }) => serie.id)).toEqual(['mercado'])
    expect(filtrarSeries(lista, 'estúdo').map(({ serie }) => serie.id)).toEqual(['estudo'])
    expect(filtrarSeries(lista, '  ')).toHaveLength(3)
  })
})
