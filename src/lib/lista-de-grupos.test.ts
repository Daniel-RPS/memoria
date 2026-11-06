import { describe, expect, it } from 'vitest'
import type { Category, GroupCard, GroupItem, GroupSeries } from '@/db/types'
import {
  contarGrupos,
  diaDeDestinoDoGrupo,
  montarListaDeGrupos,
  textoResumoDoGrupo,
  textoTotalDeGrupos,
  type DadosDaListaDeGrupos,
} from '@/lib/grupos'

const HOJE = '2026-11-06'
const MOMENTO = '2026-11-01T12:00:00.000Z'
const base = { criadoEm: MOMENTO, atualizadoEm: MOMENTO }

const serie = (id: string, titulo: string, categoryId?: string): GroupSeries => ({
  ...base,
  id,
  titulo,
  categoryId,
})
const card = (id: string, seriesId: string, data: string, arquivado = false) =>
  ({ id, seriesId, data, arquivado }) satisfies Pick<
    GroupCard,
    'id' | 'seriesId' | 'data' | 'arquivado'
  >
const item = (cardId: string, status: GroupItem['status']) => ({ cardId, status })
const categoria = (id: string, nome: string, ordem: number): Category => ({
  ...base,
  id,
  nome,
  cor: '#7c3aed',
  tipo: 'grupo',
  ordem,
})

function dados(parcial: Partial<DadosDaListaDeGrupos>): DadosDaListaDeGrupos {
  return { series: [], cards: [], itens: [], categorias: [], ...parcial }
}

describe('montarListaDeGrupos', () => {
  it('série com cards em 3 dias conta como 1 grupo e "3 dias"', () => {
    const lista = montarListaDeGrupos(
      dados({
        series: [serie('s1', 'Casa')],
        cards: [
          card('c1', 's1', '2026-11-04'),
          card('c2', 's1', '2026-11-05'),
          card('c3', 's1', HOJE),
        ],
      }),
      HOJE,
    )
    expect(lista.total).toBe(1)
    expect(lista.blocos[0].grupos[0].dias).toBe(3)
    expect(textoResumoDoGrupo(lista.blocos[0].grupos[0])).toBe('nenhum item · 3 dias')
  })

  it('itens transferidos e arquivados não contam; a cópia pendente conta uma vez', () => {
    const lista = montarListaDeGrupos(
      dados({
        series: [serie('s1', 'Casa')],
        cards: [card('c1', 's1', '2026-11-05'), card('c2', 's1', HOJE)],
        itens: [
          item('c1', 'transferido'),
          item('c2', 'pendente'),
          item('c1', 'concluido'),
          item('c1', 'arquivado'),
        ],
      }),
      HOJE,
    )
    const grupo = lista.blocos[0].grupos[0]
    expect(grupo.pendentes).toBe(1)
    expect(grupo.feitos).toBe(1)
  })

  it('série com todos os cards arquivados não aparece; com um ativo, aparece', () => {
    const entrada = dados({
      series: [serie('s1', 'Casa'), serie('s2', 'Estudos')],
      cards: [
        card('c1', 's1', HOJE, true),
        card('c2', 's2', HOJE, true),
        card('c3', 's2', '2026-11-07'),
      ],
      itens: [item('c2', 'pendente'), item('c3', 'pendente')],
    })
    const lista = montarListaDeGrupos(entrada, HOJE)
    expect(lista.total).toBe(1)
    expect(contarGrupos(entrada, HOJE)).toBe(1)
    const [grupo] = lista.blocos[0].grupos
    expect(grupo.serie.titulo).toBe('Estudos')
    // Itens do card arquivado não contam, nem o dia dele.
    expect(grupo.pendentes).toBe(1)
    expect(grupo.dias).toBe(1)
  })

  it('blocos na ordem das categorias, "Sem categoria" por último e só se houver grupos', () => {
    const categorias = [categoria('b', 'Trabalho', 1), categoria('a', 'Casa', 2)]
    const com = montarListaDeGrupos(
      dados({
        categorias,
        series: [
          serie('s1', 'Zebra', 'a'),
          serie('s2', 'ásia', 'a'),
          serie('s3', 'Relatório', 'b'),
          serie('s4', 'Livre'),
          serie('s5', 'Órfão', 'apagada'),
        ],
        cards: ['s1', 's2', 's3', 's4', 's5'].map((id) => card(`c-${id}`, id, HOJE)),
      }),
      HOJE,
    )
    expect(com.blocos.map((bloco) => bloco.categoria?.nome ?? 'Sem categoria')).toEqual([
      'Trabalho',
      'Casa',
      'Sem categoria',
    ])
    expect(com.blocos[1].grupos.map((grupo) => grupo.serie.titulo)).toEqual(['ásia', 'Zebra'])
    expect(com.blocos[2].grupos.map((grupo) => grupo.serie.titulo)).toEqual(['Livre', 'Órfão'])

    const sem = montarListaDeGrupos(
      dados({ categorias, series: [serie('s1', 'Casa', 'a')], cards: [card('c', 's1', HOJE)] }),
      HOJE,
    )
    expect(sem.blocos.map((bloco) => bloco.categoria?.nome)).toEqual(['Casa'])
  })

  it('busca pelo nome do grupo e da categoria, sem acento e maiúscula', () => {
    const entrada = dados({
      categorias: [categoria('a', 'Trabalho', 1)],
      series: [serie('s1', 'Relatório', 'a'), serie('s2', 'Mercado')],
      cards: [card('c1', 's1', HOJE), card('c2', 's2', HOJE)],
    })
    const porGrupo = montarListaDeGrupos(entrada, HOJE, 'RELATORIO')
    expect(porGrupo.blocos.flatMap((bloco) => bloco.grupos.map((g) => g.serie.titulo))).toEqual([
      'Relatório',
    ])
    const porCategoria = montarListaDeGrupos(entrada, HOJE, 'trab')
    expect(porCategoria.blocos).toHaveLength(1)
    expect(porCategoria.blocos[0].categoria?.nome).toBe('Trabalho')
    // O total não depende da busca.
    expect(porCategoria.total).toBe(2)
    expect(montarListaDeGrupos(entrada, HOJE, 'nada').blocos).toEqual([])
  })
})

describe('diaDeDestinoDoGrupo', () => {
  it('hoje, se há card hoje', () => {
    expect(diaDeDestinoDoGrupo(['2026-11-01', HOJE, '2026-11-09'], HOJE)).toBe(HOJE)
  })
  it('senão o próximo dia com card', () => {
    expect(diaDeDestinoDoGrupo(['2026-11-01', '2026-11-12', '2026-11-09'], HOJE)).toBe('2026-11-09')
  })
  it('senão o mais recente', () => {
    expect(diaDeDestinoDoGrupo(['2026-11-01', '2026-11-03', '2026-10-30'], HOJE)).toBe('2026-11-03')
  })
})

describe('textos', () => {
  it('singular e plural do total', () => {
    expect(textoTotalDeGrupos(1)).toBe('1 grupo')
    expect(textoTotalDeGrupos(12)).toBe('12 grupos')
  })
  it('resumo sem zeros desnecessários', () => {
    expect(textoResumoDoGrupo({ pendentes: 3, feitos: 5, dias: 4 })).toBe(
      '3 pendentes · 5 feitos · 4 dias',
    )
    expect(textoResumoDoGrupo({ pendentes: 1, feitos: 0, dias: 1 })).toBe('1 pendente · 1 dia')
    expect(textoResumoDoGrupo({ pendentes: 0, feitos: 1, dias: 2 })).toBe('tudo feito · 2 dias')
    expect(textoResumoDoGrupo({ pendentes: 0, feitos: 0, dias: 1 })).toBe('nenhum item · 1 dia')
  })
})
