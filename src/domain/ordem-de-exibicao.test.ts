import { describe, expect, it } from 'vitest'
import {
  blocoDe,
  chaveDoTopo,
  idsParaOrdemComum,
  manterBlocos,
  planejarGravacao,
  sortForDisplay,
  type Ordenavel,
} from '@/domain/ordem-de-exibicao'

type Item = Ordenavel & { id: string }

function item(id: string, ordem: number, extras: Partial<Ordenavel> = {}): Item {
  return { id, ordem, ...extras }
}

const andamento = (desde: string) => ({ emAndamento: true, emAndamentoDesde: desde })
const prioridade = (desde: string) => ({ prioridade: true, prioridadeDesde: desde })
const ids = (lista: Item[]) => lista.map((registro) => registro.id)

/** Grupo de 30 itens: 1 prioridade em andamento, 2 só em andamento e 3 só prioridade. */
function grupoDe30() {
  const itens = Array.from({ length: 30 }, (_, indice) => item(`i${indice + 1}`, indice + 1))
  itens[19] = item('i20', 20, {
    ...andamento('2026-11-05T10:00'),
    ...prioridade('2026-11-05T10:05'),
  })
  itens[9] = item('i10', 10, andamento('2026-11-05T09:00'))
  itens[14] = item('i15', 15, andamento('2026-11-05T09:30'))
  itens[24] = item('i25', 25, prioridade('2026-11-05T08:00'))
  itens[4] = item('i5', 5, prioridade('2026-11-05T08:30'))
  itens[27] = item('i28', 28, prioridade('2026-11-05T08:10'))
  return itens
}

describe('sortForDisplay', () => {
  it('prioridade+andamento, andamento, prioridade, demais (ordem manual)', () => {
    const resultado = ids(sortForDisplay(grupoDe30()))
    // prioridade+andamento → andamento (na ordem marcada) → prioridade (na ordem marcada) → demais
    expect(resultado.slice(0, 6)).toEqual(['i20', 'i10', 'i15', 'i25', 'i28', 'i5'])
    expect(resultado.slice(6, 9)).toEqual(['i1', 'i2', 'i3'])
    expect(resultado).toHaveLength(30)
    const demais = resultado.slice(6)
    expect(demais).toEqual([...demais].sort((a, b) => Number(a.slice(1)) - Number(b.slice(1))))
  })

  it('não muda a lista recebida nem o campo ordem', () => {
    const itens = grupoDe30()
    const copia = JSON.stringify(itens)
    sortForDisplay(itens)
    expect(JSON.stringify(itens)).toBe(copia)
  })

  it('parar o andamento ou tirar a prioridade devolve ao lugar que a ordem manda', () => {
    const itens = Array.from({ length: 10 }, (_, indice) => item(`i${indice + 1}`, indice + 1))
    expect(ids(sortForDisplay(itens)).indexOf('i7')).toBe(6)

    itens[6] = item('i7', 7, andamento('2026-11-05T10:00'))
    expect(ids(sortForDisplay(itens))[0]).toBe('i7')

    itens[6] = item('i7', 7) // parou: volta para a 7ª posição
    expect(ids(sortForDisplay(itens)).indexOf('i7')).toBe(6)
  })

  it('tirar a prioridade de quem também está em andamento desce para o bloco em andamento', () => {
    const itens = [
      item('a', 1, andamento('2026-11-05T09:00')),
      item('b', 2, andamento('2026-11-05T09:30')),
      item('c', 3, { ...andamento('2026-11-05T10:00'), ...prioridade('2026-11-05T10:01') }),
      item('d', 4),
    ]
    expect(ids(sortForDisplay(itens))).toEqual(['c', 'a', 'b', 'd'])
    itens[2] = item('c', 3, andamento('2026-11-05T10:00'))
    expect(ids(sortForDisplay(itens))).toEqual(['a', 'b', 'c', 'd'])
  })

  it('posição arrastada no bloco do topo vale; quem chega depois entra no fim, pela hora', () => {
    const base = [
      item('a', 1, andamento('2026-11-05T09:00')),
      item('b', 2, andamento('2026-11-05T09:30')),
    ]
    const arrastados = base.map((registro, indice) => ({
      ...registro,
      ordemNoTopo: { chave: chaveDoTopo(registro), posicao: 2 - indice },
    }))
    const novo = item('n', 9, andamento('2026-11-05T11:00'))
    expect(ids(sortForDisplay([...arrastados, novo]))).toEqual(['b', 'a', 'n'])
  })

  it('posição arrastada velha (marcou de novo, outro bloco) é ignorada', () => {
    const antigo = item('a', 1, andamento('2026-11-05T09:00'))
    const comPosicao = { ...antigo, ordemNoTopo: { chave: chaveDoTopo(antigo), posicao: 5 } }
    const remarcado = { ...comPosicao, ...andamento('2026-11-05T12:00') }
    const outro = item('b', 2, andamento('2026-11-05T10:00'))
    expect(ids(sortForDisplay([remarcado, outro]))).toEqual(['b', 'a'])
    expect(blocoDe({ ...comPosicao, prioridade: true })).toBe(0)
  })

  it('lista mista (cards do dia): só tarefas com marca sobem; cards ficam entre os demais', () => {
    const entradas = [
      { tipo: 'grupo', ordem: 1 },
      { tipo: 'tarefa', registro: item('t1', 2) },
      { tipo: 'tarefa', registro: item('t2', 3, prioridade('2026-11-05T10:00')) },
      { tipo: 'grupo', ordem: 4 },
    ] as const
    const resultado = sortForDisplay([...entradas], (entrada) =>
      entrada.tipo === 'tarefa' ? entrada.registro : { ordem: entrada.ordem },
    )
    expect(resultado.map((e) => (e.tipo === 'tarefa' ? e.registro.id : `card${e.ordem}`))).toEqual([
      't2',
      'card1',
      't1',
      'card4',
    ])
  })
})

describe('arrastar por bloco', () => {
  const registros = new Map<string, Item>([
    ['p1', item('p1', 5, prioridade('1'))],
    ['p2', item('p2', 6, prioridade('2'))],
    ['x', item('x', 1)],
    ['y', item('y', 2)],
    ['z', item('z', 3)],
  ])
  const blocoDoId = (id: string) => {
    const registro = registros.get(id)
    return registro ? blocoDe(registro) : undefined
  }

  it('solto fora do próprio bloco, para na borda dele', () => {
    // y arrastado para cima dos prioritários.
    expect(manterBlocos(['y', 'p1', 'p2', 'x', 'z'], blocoDoId)).toEqual([
      'p1',
      'p2',
      'y',
      'x',
      'z',
    ])
    // p2 arrastado para baixo, entre os demais.
    expect(manterBlocos(['p1', 'x', 'p2', 'y', 'z'], blocoDoId)).toEqual([
      'p1',
      'p2',
      'x',
      'y',
      'z',
    ])
  })

  it('mexer no topo grava só a posição dos membros daquele bloco', () => {
    expect(planejarGravacao(['p2', 'p1', 'x', 'y', 'z'], 'p2', blocoDoId)).toEqual({
      tipo: 'topo',
      ids: ['p2', 'p1'],
    })
  })

  it('mexer nos demais grava a ordem entre os vizinhos dos demais', () => {
    expect(planejarGravacao(['p1', 'p2', 'y', 'x', 'z'], 'y', blocoDoId)).toEqual({
      tipo: 'ordem',
      ids: ['y', 'x', 'z'],
    })
    expect(idsParaOrdemComum(['p1', 'p2', 'x', 'z'], 'p1', blocoDoId)).toEqual(['p1', 'x', 'z'])
  })
})
