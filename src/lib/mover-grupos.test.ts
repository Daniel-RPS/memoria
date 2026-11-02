import { describe, expect, it } from 'vitest'
import type { GroupCard, GroupItem } from '@/db/types'
import {
  aplicarMudancas,
  inverterMudancas,
  planejarLevarItens,
  type EstadoDosGrupos,
} from '@/lib/mover-grupos'

const MOMENTO = '2026-10-31T12:00:00.000Z'
const SERIE = { id: 'casa', titulo: 'Casa', criadoEm: MOMENTO, atualizadoEm: MOMENTO }

function card(id: string, data: string, extras: Partial<GroupCard> = {}): GroupCard {
  return {
    id,
    seriesId: 'casa',
    data,
    ordem: 1,
    arquivado: false,
    criadoEm: MOMENTO,
    atualizadoEm: MOMENTO,
    ...extras,
  }
}

function item(id: string, cardId: string, ordem: number, extras: Partial<GroupItem> = {}) {
  return {
    id,
    cardId,
    titulo: id,
    ordem,
    status: 'pendente',
    dataOriginal: '2026-11-02',
    cadeiaId: id,
    criadoEm: MOMENTO,
    atualizadoEm: MOMENTO,
    ...extras,
  } satisfies GroupItem
}

/** Ids previsíveis e únicos no arquivo para os registros novos: novo-1, novo-2... */
let contador = 0
function contexto() {
  return { momento: MOMENTO, novoId: () => `novo-${++contador}`, maiorOrdemDoDestino: 0 }
}

/** Leva e devolve o estado seguinte e quantos itens foram. */
function levar(estado: EstadoDosGrupos, ids: string[], destino: string) {
  const plano = planejarLevarItens(estado, ids, destino, contexto())
  return { estado: aplicarMudancas(estado, plano.mudancas), plano }
}

/** Resumo legível: `{ '2026-11-02': ['[ ] janta', '[→] banho'] }`, cards na ordem dos dias. */
function resumo(estado: EstadoDosGrupos) {
  const marca = { pendente: '[ ]', concluido: '[x]', transferido: '[→]', arquivado: '[a]' }
  const porDia: Record<string, string[]> = {}
  for (const c of [...estado.cards].sort((a, b) => a.data.localeCompare(b.data))) {
    porDia[c.data] = estado.itens
      .filter((i) => i.cardId === c.id)
      .sort((a, b) => a.ordem - b.ordem)
      .map((i) => `${marca[i.status]} ${i.titulo}`)
  }
  return porDia
}

const DIA_2 = '2026-11-02'
const DIA_3 = '2026-11-03'

describe('planejarLevarItens', () => {
  it('grupo com 2 pendentes: os dois vão juntos, em ordem, numa operação', () => {
    const inicial: EstadoDosGrupos = {
      series: [SERIE],
      cards: [card('c2', DIA_2)],
      itens: [
        item('janta', 'c2', 1),
        item('louça', 'c2', 2, { status: 'concluido' }),
        item('banho', 'c2', 3),
      ],
    }
    const { estado, plano } = levar(inicial, ['janta', 'banho'], DIA_3)

    expect(plano.itensLevados).toBe(2)
    expect(resumo(estado)).toEqual({
      [DIA_2]: ['[→] janta', '[x] louça', '[→] banho'],
      [DIA_3]: ['[ ] janta', '[ ] banho'],
    })
    const novo = estado.cards.find((c) => c.data === DIA_3)!
    expect(novo).toMatchObject({ seriesId: 'casa', criadoPorTransferencia: true })
    expect(estado.itens.find((i) => i.id === 'janta')?.transferidoParaCardId).toBe(novo.id)
  })

  it('destino com card da série: mescla no fim, sem outro card', () => {
    const inicial: EstadoDosGrupos = {
      series: [SERIE],
      cards: [card('c2', DIA_2), card('c3', DIA_3)],
      itens: [item('janta', 'c2', 1), item('roupa', 'c3', 1)],
    }
    const { estado } = levar(inicial, ['janta'], DIA_3)

    expect(estado.cards).toHaveLength(2)
    expect(resumo(estado)[DIA_3]).toEqual(['[ ] roupa', '[ ] janta'])
  })

  it('ida e volta de um item (2 → 3 → 2): sem duplicata e sem card fantasma', () => {
    const inicial: EstadoDosGrupos = {
      series: [SERIE],
      cards: [card('c2', DIA_2)],
      itens: [item('janta', 'c2', 1), item('banho', 'c2', 2)],
    }
    const ida = levar(inicial, ['janta'], DIA_3).estado
    const copia = ida.itens.find((i) => i.origemItemId === 'janta')!
    const { estado, plano } = levar(ida, [copia.id], DIA_2)

    expect(plano.itensLevados).toBe(1)
    expect(resumo(estado)).toEqual({ [DIA_2]: ['[ ] janta', '[ ] banho'] })
    expect(estado.itens.find((i) => i.id === 'janta')?.transferidoParaCardId).toBeUndefined()
    expect(estado.series).toHaveLength(1)
  })

  it('ida e volta do grupo inteiro: mesmo resultado', () => {
    const inicial: EstadoDosGrupos = {
      series: [SERIE],
      cards: [card('c2', DIA_2)],
      itens: [item('janta', 'c2', 1), item('banho', 'c2', 2)],
    }
    const ida = levar(inicial, ['janta', 'banho'], DIA_3).estado
    const copias = ida.itens.filter((i) => i.cardId !== 'c2').map((i) => i.id)
    const { estado } = levar(ida, copias, DIA_2)

    expect(resumo(estado)).toEqual({ [DIA_2]: ['[ ] janta', '[ ] banho'] })
  })

  it('volta do grupo com item novo no destino: reativa os que vieram, copia o novo e o card some', () => {
    const inicial: EstadoDosGrupos = {
      series: [SERIE],
      cards: [card('c2', DIA_2)],
      itens: [item('janta', 'c2', 1)],
    }
    const ida = levar(inicial, ['janta'], DIA_3).estado
    const card3 = ida.cards.find((c) => c.data === DIA_3)!
    const comNovo = { ...ida, itens: [...ida.itens, item('lixo', card3.id, 5)] }
    const pendentes3 = comNovo.itens.filter((i) => i.cardId === card3.id).map((i) => i.id)
    const { estado } = levar(comNovo, pendentes3, DIA_2)

    // O card do dia 3 nasceu da transferência e ficou só com transferido: some.
    expect(resumo(estado)).toEqual({ [DIA_2]: ['[ ] janta', '[ ] lixo'] })
    expect(estado.itens.find((i) => i.titulo === 'lixo')?.origemItemId).toBeUndefined()
  })

  it('cadeia 30 → 31 → 1 → 2 e volta para 1: reativa no dia 1', () => {
    const dias = ['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02']
    let estado: EstadoDosGrupos = {
      series: [SERIE],
      cards: [card('c30', dias[0])],
      itens: [item('janta', 'c30', 1)],
    }
    let atual = 'janta'
    for (const dia of dias.slice(1)) {
      estado = levar(estado, [atual], dia).estado
      atual = estado.itens.find((i) => i.origemItemId === atual)!.id
    }
    const doDia1 = estado.itens.find(
      (i) => estado.cards.find((c) => c.id === i.cardId)?.data === dias[2],
    )!

    estado = levar(estado, [atual], dias[2]).estado

    expect(resumo(estado)).toEqual({
      [dias[0]]: ['[→] janta'],
      [dias[1]]: ['[→] janta'],
      [dias[2]]: ['[ ] janta'],
    })
    expect(estado.itens.find((i) => i.id === doDia1.id)?.status).toBe('pendente')
  })

  it('cadeia 30 → 31 → 1 → 2 e volta direto para 30: as paradas somem', () => {
    const dias = ['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02']
    let estado: EstadoDosGrupos = {
      series: [SERIE],
      cards: [card('c30', dias[0])],
      itens: [item('janta', 'c30', 1)],
    }
    let atual = 'janta'
    for (const dia of dias.slice(1)) {
      estado = levar(estado, [atual], dia).estado
      atual = estado.itens.find((i) => i.origemItemId === atual)!.id
    }

    estado = levar(estado, [atual], dias[0]).estado

    expect(resumo(estado)).toEqual({ [dias[0]]: ['[ ] janta'] })
  })

  it('card de transferência que ainda tem outro item real fica', () => {
    const inicial: EstadoDosGrupos = {
      series: [SERIE],
      cards: [card('c2', DIA_2)],
      itens: [item('janta', 'c2', 1)],
    }
    const ida = levar(inicial, ['janta'], DIA_3).estado
    const card3 = ida.cards.find((c) => c.data === DIA_3)!
    const comFeito = {
      ...ida,
      itens: [...ida.itens, item('lixo', card3.id, 5, { status: 'concluido' })],
    }
    const copia = comFeito.itens.find((i) => i.origemItemId === 'janta')!
    const { estado } = levar(comFeito, [copia.id], DIA_2)

    expect(resumo(estado)).toEqual({ [DIA_2]: ['[ ] janta'], [DIA_3]: ['[x] lixo'] })
  })

  it('card criado à mão que fica vazio não é apagado', () => {
    // O card do dia 3 existia antes (criado à mão) e recebeu a cópia por mescla.
    const inicial: EstadoDosGrupos = {
      series: [SERIE],
      cards: [card('c2', DIA_2), card('c3', DIA_3)],
      itens: [item('janta', 'c2', 1)],
    }
    const ida = levar(inicial, ['janta'], DIA_3).estado
    const copia = ida.itens.find((i) => i.origemItemId === 'janta')!
    const { estado } = levar(ida, [copia.id], DIA_2)

    expect(resumo(estado)).toEqual({ [DIA_2]: ['[ ] janta'], [DIA_3]: [] })
  })

  it('ignora feitos, transferidos e itens que já estão no destino', () => {
    const inicial: EstadoDosGrupos = {
      series: [SERIE],
      cards: [card('c2', DIA_2)],
      itens: [item('feito', 'c2', 1, { status: 'concluido' }), item('aqui', 'c2', 2)],
    }
    const { plano } = levar(inicial, ['feito', 'aqui'], DIA_2)
    expect(plano.itensLevados).toBe(0)
    expect(plano.mudancas.gravar.itens).toEqual([])
  })

  it('desfazer: as mudanças inversas restauram exatamente o estado anterior', () => {
    const inicial: EstadoDosGrupos = {
      series: [SERIE],
      cards: [card('c2', DIA_2)],
      itens: [item('janta', 'c2', 1), item('banho', 'c2', 2)],
    }
    const ida = levar(inicial, ['janta'], DIA_3)
    const desfeito = aplicarMudancas(ida.estado, inverterMudancas(inicial, ida.plano.mudancas))
    expect(ordenado(desfeito)).toEqual(ordenado(inicial))

    // A volta (que apaga a cópia e o card fantasma) também é desfeita por inteiro.
    const copia = ida.estado.itens.find((i) => i.origemItemId === 'janta')!
    const volta = levar(ida.estado, [copia.id], DIA_2)
    const desfeitaVolta = aplicarMudancas(
      volta.estado,
      inverterMudancas(ida.estado, volta.plano.mudancas),
    )
    expect(ordenado(desfeitaVolta)).toEqual(ordenado(ida.estado))
  })
})

function ordenado(estado: EstadoDosGrupos) {
  const porId = (a: { id: string }, b: { id: string }) => a.id.localeCompare(b.id)
  return {
    series: [...estado.series].sort(porId),
    cards: [...estado.cards].sort(porId),
    itens: [...estado.itens].sort(porId),
  }
}
