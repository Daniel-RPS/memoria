import { describe, expect, it } from 'vitest'
import type { GroupCard, GroupItem, GroupSeries, Task } from '@/db/types'
import { filtrarSeries, montarGrupos, ordenarParaEscolher } from '@/lib/grupos'
import { hoje as hojeLocal } from '@/lib/datas'
import { contarProximosDias, montarResumoDoDia, textoHaDias } from '@/lib/inicio'

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
  return {
    id,
    cadeiaId: id,
    cardId,
    titulo: id,
    ordem: 1,
    status,
    dataOriginal,
    criadoEm: '',
    atualizadoEm: '',
  }
}

function rotulos(resumo: ReturnType<typeof montarResumoDoDia>) {
  return {
    grupos: resumo.grupos.map(
      ({ grupo, itens, feitos, total }) =>
        `${grupo.card.id} ${feitos}/${total}: ${itens
          .map(({ item, dias }) => (dias === null ? item.id : `${item.id}(${dias})`))
          .join(', ')}`,
    ),
    soltas: resumo.soltas.map(({ tarefa, dias }) =>
      dias === null ? tarefa.id : `${tarefa.id}(${dias})`,
    ),
    pendentes: resumo.pendentes,
  }
}

describe('Resumo do dia (Hoje e Atrasadas)', () => {
  it('separa grupos e tarefas soltas, cada lista na ordem do dia', () => {
    const tarefas = [
      tarefa({ id: 'mandar', data: HOJE, ordem: 3 }),
      tarefa({ id: 'ligar', data: HOJE, ordem: 1, status: 'concluida' }),
      tarefa({ id: 'guardada', data: HOJE, ordem: 2, status: 'arquivada' }),
    ]
    const grupos = montarGrupos(
      [
        { ...card('casa', HOJE), ordem: 4 },
        { ...card('mercado', HOJE), ordem: 0 },
      ],
      [SERIE],
      [
        { ...item('varrer', 'casa', 'concluido', HOJE), ordem: 1 },
        { ...item('louca', 'casa', 'pendente', HOJE), ordem: 2 },
        { ...item('plantas', 'casa', 'pendente', HOJE), ordem: 3 },
        item('arroz', 'mercado', 'pendente', HOJE),
      ],
    )

    expect(rotulos(montarResumoDoDia(tarefas, grupos, HOJE))).toEqual({
      grupos: ['mercado 0/1: arroz', 'casa 1/3: louca, plantas, varrer'],
      soltas: ['ligar', 'mandar'],
      pendentes: 4,
    })
  })

  it('sem tarefas soltas a lista de soltas vem vazia; card sem item real não aparece', () => {
    const grupos = montarGrupos(
      [card('casa', HOJE), card('vazio', HOJE)],
      [SERIE],
      [item('varrer', 'casa', 'pendente', HOJE), item('ido', 'vazio', 'transferido', HOJE)],
    )

    const resumo = montarResumoDoDia([], grupos, HOJE)

    expect(resumo.soltas).toEqual([])
    expect(rotulos(resumo).grupos).toEqual(['casa 0/1: varrer'])
  })

  it('progresso do grupo ignora itens transferidos', () => {
    const grupos = montarGrupos(
      [card('casa', HOJE)],
      [SERIE],
      [
        item('feito', 'casa', 'concluido', HOJE),
        item('pendente', 'casa', 'pendente', HOJE),
        item('levado', 'casa', 'transferido', HOJE),
        item('guardado', 'casa', 'arquivado', HOJE),
      ],
    )

    const [casa] = montarResumoDoDia([], grupos, HOJE).grupos

    expect({ feitos: casa?.feitos, total: casa?.total }).toEqual({ feitos: 1, total: 2 })
  })

  it('pendentes de Hoje = itens pendentes dos grupos + tarefas soltas pendentes', () => {
    const tarefas = [
      tarefa({ id: 'a', data: HOJE }),
      tarefa({ id: 'b', data: HOJE, status: 'concluida' }),
    ]
    const grupos = montarGrupos(
      [card('c1', HOJE), card('c2', HOJE)],
      [SERIE],
      [
        item('i1', 'c1', 'pendente', HOJE),
        item('i2', 'c1', 'concluido', HOJE),
        item('i3', 'c2', 'pendente', HOJE),
        item('i4', 'c2', 'transferido', HOJE),
      ],
    )

    expect(montarResumoDoDia(tarefas, grupos, HOJE).pendentes).toBe(3)
  })

  it('atrasadas: "há X dias" pela dataOriginal, do dia mais antigo ao mais recente', () => {
    const tarefas = [
      tarefa({ id: 'ontem', data: '2026-11-01' }),
      tarefa({ id: 'movida', data: '2026-10-31', dataOriginal: '2026-10-20' }),
    ]
    const grupos = montarGrupos(
      [card('c1', '2026-10-30'), card('c2', '2026-10-28')],
      [SERIE],
      [
        item('i1', 'c1', 'pendente', '2026-10-27'),
        item('i2', 'c1', 'pendente', '2026-10-30'),
        item('i3', 'c1', 'concluido', '2026-10-30'),
        item('i4', 'c2', 'pendente', '2026-10-28'),
      ],
    )

    expect(rotulos(montarResumoDoDia(tarefas, grupos, HOJE))).toEqual({
      grupos: ['c2 0/1: i4(5)', 'c1 1/3: i1(6), i2(3), i3'],
      soltas: ['movida(13)', 'ontem(1)'],
      pendentes: 5,
    })
    expect(textoHaDias(1)).toBe('há 1 dia')
    expect(textoHaDias(6)).toBe('há 6 dias')
  })

  it('na virada do dia conta pela data local de São Paulo, não pela UTC', () => {
    const tarefas = [tarefa({ id: 'ontem', data: '2026-11-01' })]
    // 23h30 de 01/11 em São Paulo já é 02/11 em UTC: ainda não está atrasada.
    const antesDaMeiaNoite = hojeLocal(new Date('2026-11-01T23:30:00-03:00'))
    // 00h10 de 02/11: virou o dia, atrasada há 1 dia.
    const depoisDaMeiaNoite = hojeLocal(new Date('2026-11-02T00:10:00-03:00'))

    expect(antesDaMeiaNoite).toBe('2026-11-01')
    expect(rotulos(montarResumoDoDia(tarefas, [], antesDaMeiaNoite)).soltas).toEqual(['ontem'])
    expect(rotulos(montarResumoDoDia(tarefas, [], depoisDaMeiaNoite)).soltas).toEqual(['ontem(1)'])
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
