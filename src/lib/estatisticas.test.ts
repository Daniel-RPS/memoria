import { describe, expect, it } from 'vitest'
import type { GroupCard, GroupItem, GroupSeries, Task } from '@/db/types'
import {
  contarPorDia,
  diaDoMomento,
  faixasDeIntensidade,
  listarConclusoes,
  montarSemanasDoMapa,
  nivelDeIntensidade,
  periodoDoMapa,
  rotulosDosMeses,
  textoDoQuadrado,
  totalNoPeriodo,
} from '@/lib/estatisticas'

type TarefaParaContar = Pick<Task, 'status' | 'concluidaEm' | 'data' | 'categoryId'>
type ItemParaContar = Pick<GroupItem, 'status' | 'concluidoEm' | 'cardId'>

const CARDS: Pick<GroupCard, 'id' | 'data' | 'seriesId'>[] = [
  { id: 'card-casa', data: '2026-10-10', seriesId: 'casa' },
]
const SERIES: Pick<GroupSeries, 'id' | 'categoryId'>[] = [{ id: 'casa', categoryId: 'cat-casa' }]

/** Momento ISO de um horário em São Paulo (UTC−3, sem horário de verão em 2026). */
function emSaoPaulo(data: string, hora: string) {
  return new Date(`${data}T${hora}:00-03:00`).toISOString()
}

describe('contagem de conclusões por dia', () => {
  it('conta tarefas soltas e itens de grupo concluídos; transferidos e arquivados não', () => {
    const tarefas: TarefaParaContar[] = [
      { status: 'concluida', data: '2026-10-12', concluidaEm: emSaoPaulo('2026-10-12', '09:00') },
      { status: 'pendente', data: '2026-10-12' },
      { status: 'arquivada', data: '2026-10-12', concluidaEm: emSaoPaulo('2026-10-12', '10:00') },
    ]
    const itens: ItemParaContar[] = [
      { status: 'concluido', cardId: 'card-casa', concluidoEm: emSaoPaulo('2026-10-12', '11:00') },
      { status: 'transferido', cardId: 'card-casa' },
      { status: 'arquivado', cardId: 'card-casa' },
      { status: 'pendente', cardId: 'card-casa' },
    ]

    const contagem = contarPorDia(listarConclusoes(tarefas, itens, CARDS, SERIES))

    expect([...contagem]).toEqual([['2026-10-12', 2]])
  })

  it('usa o dia da conclusão, não o dia planejado', () => {
    const tarefas: TarefaParaContar[] = [
      { status: 'concluida', data: '2026-10-01', concluidaEm: emSaoPaulo('2026-10-05', '08:00') },
    ]
    expect(listarConclusoes(tarefas, [], [], [])).toEqual([{ data: '2026-10-05' }])
  })

  it('sem o momento da conclusão (dado antigo), usa o dia da tarefa ou do card', () => {
    const conclusoes = listarConclusoes(
      [{ status: 'concluida', data: '2026-09-30' }],
      [{ status: 'concluido', cardId: 'card-casa' }],
      CARDS,
      SERIES,
    )
    expect(conclusoes.map((conclusao) => conclusao.data)).toEqual(['2026-09-30', '2026-10-10'])
  })

  it('filtra por categoria (o item usa a categoria da série)', () => {
    const conclusoes = listarConclusoes(
      [
        { status: 'concluida', data: '2026-10-12', categoryId: 'cat-trabalho' },
        { status: 'concluida', data: '2026-10-12', categoryId: 'cat-casa' },
      ],
      [
        {
          status: 'concluido',
          cardId: 'card-casa',
          concluidoEm: emSaoPaulo('2026-10-12', '12:00'),
        },
      ],
      CARDS,
      SERIES,
    )
    expect(contarPorDia(conclusoes, 'cat-casa').get('2026-10-12')).toBe(2)
    expect(contarPorDia(conclusoes, 'cat-trabalho').get('2026-10-12')).toBe(1)
    expect(contarPorDia(conclusoes).get('2026-10-12')).toBe(3)
  })
})

describe('datas no limite do dia', () => {
  it('23:59 e 00:01 em São Paulo caem no dia local certo (não no dia UTC)', () => {
    // 23:59 de 12/10 em São Paulo já é 13/10 em UTC.
    expect(diaDoMomento(emSaoPaulo('2026-10-12', '23:59'))).toBe('2026-10-12')
    expect(diaDoMomento('2026-10-13T02:59:00.000Z')).toBe('2026-10-12')
    // 00:01 de 13/10 em São Paulo.
    expect(diaDoMomento(emSaoPaulo('2026-10-13', '00:01'))).toBe('2026-10-13')
    expect(diaDoMomento('2026-10-13T03:01:00.000Z')).toBe('2026-10-13')
  })
})

describe('grade do mapa', () => {
  it('colunas de domingo a sábado, do domingo de um ano atrás até a semana de hoje', () => {
    const semanas = montarSemanasDoMapa('2026-11-02')
    expect(semanas[0][0].data).toBe('2025-11-02') // domingo
    expect(semanas.every((semana) => semana.length === 7)).toBe(true)
    const ultima = semanas.at(-1)!
    expect(ultima[0].data).toBe('2026-11-01') // domingo da semana de hoje
    expect(ultima.filter((dia) => !dia.isFuturo).map((dia) => dia.data)).toEqual([
      '2026-11-01',
      '2026-11-02',
    ])
    expect(periodoDoMapa(semanas)).toEqual({ inicio: '2025-11-02', fim: '2026-11-02' })
  })

  it('rótulos dos meses na coluna onde o mês começa, sem o da última coluna', () => {
    const semanas = montarSemanasDoMapa('2026-11-02')
    const rotulos = rotulosDosMeses(semanas).map((rotulo) => rotulo.data.slice(0, 7))
    expect(rotulos[0]).toBe('2025-11')
    expect(rotulos.at(-1)).toBe('2026-10')
    expect(new Set(rotulos).size).toBe(rotulos.length)
  })
})

describe('faixas de intensidade', () => {
  it('quartis dos dias com conclusões; zero fica no nível 0', () => {
    const faixas = faixasDeIntensidade([0, 1, 2, 3, 4, 5, 6, 7, 8])
    expect(faixas).toEqual([2, 4, 6])
    expect([0, 1, 2, 3, 4, 5, 6, 7, 8].map((valor) => nivelDeIntensidade(valor, faixas))).toEqual([
      0, 1, 1, 2, 2, 3, 3, 4, 4,
    ])
  })

  it('sem nenhuma conclusão, tudo nível 0', () => {
    const faixas = faixasDeIntensidade([0, 0])
    expect(faixas).toEqual([0, 0, 0])
    expect(nivelDeIntensidade(0, faixas)).toBe(0)
  })
})

describe('resumo', () => {
  it('total do período', () => {
    const contagem = new Map([
      ['2026-10-29', 4],
      ['2026-10-30', 3],
      ['2026-10-31', 1],
      ['2026-11-01', 2],
    ])
    expect(totalNoPeriodo(contagem, '2026-10-30', '2026-11-02')).toBe(6)
  })

  it('texto da dica do quadrado', () => {
    expect(textoDoQuadrado(5, '2026-10-12')).toBe('5 concluídos em 12/10/2026')
    expect(textoDoQuadrado(1, '2026-10-12')).toBe('1 concluído em 12/10/2026')
    expect(textoDoQuadrado(0, '2026-10-12')).toBe('Nada concluído em 12/10/2026')
  })
})
