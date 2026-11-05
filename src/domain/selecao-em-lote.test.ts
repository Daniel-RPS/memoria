import { describe, expect, it } from 'vitest'
import {
  aplicarClique,
  deslocar,
  inserirBloco,
  ordensEntre,
  planejarOrdens,
  SELECAO_VAZIA,
  type AlvoDeClique,
  type EstadoDaSelecao,
} from '@/domain/selecao-em-lote'

const SEM = { shift: false, ctrl: false }
const CTRL = { shift: false, ctrl: true }
const SHIFT = { shift: true, ctrl: false }
const SHIFT_CTRL = { shift: true, ctrl: true }

const linha = (id: string): AlvoDeClique => ({ id, tipo: 'linhas' })
const subetapa = (id: string, dono: string): AlvoDeClique => ({ id, tipo: 'subetapas', dono })
const LINHAS = ['a', 'b', 'c', 'd', 'e'].map(linha)

function clicar(estado: EstadoDaSelecao, id: string, mods = SEM, ordem = LINHAS) {
  const alvo = ordem.find((outro) => outro.id === id)!
  return aplicarClique(estado, alvo, mods, ordem)
}
const ids = (estado: EstadoDaSelecao) => [...estado.ids].sort()

describe('seleção por clique', () => {
  it('Ctrl+clique põe e tira uma da seleção', () => {
    let estado = clicar(SELECAO_VAZIA, 'b', CTRL)
    estado = clicar(estado, 'd', CTRL)
    expect(ids(estado)).toEqual(['b', 'd'])
    estado = clicar(estado, 'b', CTRL)
    expect(ids(estado)).toEqual(['d'])
  })

  it('Shift+clique seleciona o intervalo entre a última clicada e esta (2º ao 4º = 3)', () => {
    let estado = clicar(SELECAO_VAZIA, 'b', CTRL)
    estado = clicar(estado, 'd', SHIFT)
    expect(ids(estado)).toEqual(['b', 'c', 'd'])
    // O intervalo parte sempre da âncora, para os dois lados.
    estado = clicar(estado, 'a', SHIFT)
    expect(ids(estado)).toEqual(['a', 'b'])
  })

  it('Shift+Ctrl soma o intervalo ao que já estava selecionado', () => {
    let estado = clicar(SELECAO_VAZIA, 'a', CTRL)
    estado = clicar(estado, 'c', CTRL)
    estado = clicar(estado, 'e', SHIFT_CTRL)
    expect(ids(estado)).toEqual(['a', 'c', 'd', 'e'])
  })

  it('Shift+clique sem âncora seleciona só a clicada', () => {
    expect(ids(clicar(SELECAO_VAZIA, 'c', SHIFT))).toEqual(['c'])
  })

  it('subetapas não se misturam com linhas: a seleção anterior é trocada', () => {
    const ordem = [...LINHAS, subetapa('s1', 't'), subetapa('s2', 't'), subetapa('s3', 't')]
    let estado = clicar(SELECAO_VAZIA, 'a', CTRL, ordem)
    estado = clicar(estado, 'b', CTRL, ordem)
    estado = clicar(estado, 's1', CTRL, ordem)
    expect(estado).toMatchObject({ tipo: 'subetapas', dono: 't' })
    expect(ids(estado)).toEqual(['s1'])
    estado = clicar(estado, 's3', SHIFT, ordem)
    expect(ids(estado)).toEqual(['s1', 's2', 's3'])
    // Clicar numa linha troca de volta.
    estado = clicar(estado, 'c', CTRL, ordem)
    expect(estado.tipo).toBe('linhas')
    expect(ids(estado)).toEqual(['c'])
  })

  it('subetapas de outra tarefa também trocam a seleção; o intervalo fica no mesmo dono', () => {
    const ordem = [
      subetapa('x1', 't1'),
      subetapa('x2', 't1'),
      subetapa('y1', 't2'),
      subetapa('y2', 't2'),
    ]
    let estado = clicar(SELECAO_VAZIA, 'x1', CTRL, ordem)
    estado = clicar(estado, 'y1', CTRL, ordem)
    expect(estado).toMatchObject({ dono: 't2' })
    expect(ids(estado)).toEqual(['y1'])
    estado = clicar(estado, 'y2', SHIFT, ordem)
    expect(ids(estado)).toEqual(['y1', 'y2'])
  })
})

describe('mover em lote (regras puras)', () => {
  it('inserirBloco: o bloco entra junto, na ordem, depois do alvo se vinha de cima', () => {
    const lista = ['a', 'b', 'c', 'd', 'e']
    expect(inserirBloco(lista, ['a', 'b'], 'd')).toEqual(['c', 'd', 'a', 'b', 'e'])
  })

  it('inserirBloco: antes do alvo se vinha de baixo (subir as 3 para o topo)', () => {
    const lista = ['a', 'b', 'c', 'd', 'e']
    expect(inserirBloco(lista, ['c', 'd', 'e'], 'a')).toEqual(['c', 'd', 'e', 'a', 'b'])
  })

  it('inserirBloco: soltar sobre um dos movidos não muda; de outra lista entra antes do alvo', () => {
    const lista = ['a', 'b', 'c']
    expect(inserirBloco(lista, ['a', 'b'], 'b')).toBe(lista)
    expect(inserirBloco(lista, ['x', 'y'], 'b')).toEqual(['a', 'x', 'y', 'b', 'c'])
    expect(inserirBloco(lista, ['a', 'x'], 'c')).toEqual(['b', 'c', 'a', 'x'])
  })

  it('deslocar (Alt+↑/↓): uma posição, juntas, e paradas na ponta', () => {
    const lista = ['a', 'b', 'c', 'd', 'e']
    expect(deslocar(lista, new Set(['c', 'd']), -1)).toEqual(['a', 'c', 'd', 'b', 'e'])
    expect(deslocar(lista, new Set(['c', 'd']), 1)).toEqual(['a', 'b', 'e', 'c', 'd'])
    expect(deslocar(lista, new Set(['a', 'c']), -1)).toEqual(['a', 'c', 'b', 'd', 'e'])
    expect(deslocar(lista, new Set(['d', 'e']), 1)).toEqual(lista)
  })

  it('ordensEntre: valores crescentes entre os vizinhos, ou null se não couber', () => {
    expect(ordensEntre(1, 2, 3)).toEqual([1.25, 1.5, 1.75])
    expect(ordensEntre(undefined, 5, 2)).toEqual([3, 4])
    expect(ordensEntre(5, undefined, 2)).toEqual([6, 7])
    expect(ordensEntre(undefined, undefined, 2)).toEqual([1, 2])
    expect(ordensEntre(1, 1, 2)).toBeNull()
    expect(ordensEntre(1, 1 + Number.EPSILON, 3)).toBeNull()
  })

  it('planejarOrdens: só os movidos ganham ordem, cada sequência entre os vizinhos parados', () => {
    const ordem = new Map([
      ['a', 1],
      ['b', 2],
      ['c', 3],
      ['d', 4],
      ['e', 5],
    ])
    // c, d, e subiram para o topo: a ordem de a e b não muda.
    const plano = planejarOrdens(['c', 'd', 'e', 'a', 'b'], new Set(['c', 'd', 'e']), (id) =>
      ordem.get(id)!,
    )
    expect(plano.tipo).toBe('ordens')
    if (plano.tipo !== 'ordens') return
    const valores = ['c', 'd', 'e'].map((id) => plano.ordens.get(id)!)
    expect(valores[0]).toBeLessThan(valores[1])
    expect(valores[1]).toBeLessThan(valores[2])
    expect(valores[2]).toBeLessThan(ordem.get('a')!)
    expect(plano.ordens.has('a')).toBe(false)

    // Sequências separadas, cada uma entre os seus vizinhos.
    const separado = planejarOrdens(['b', 'a', 'd', 'c'], new Set(['a', 'c']), (id) =>
      ordem.get(id)!,
    )
    expect(separado.tipo).toBe('ordens')
    if (separado.tipo !== 'ordens') return
    expect(separado.ordens.get('a')!).toBeGreaterThan(2)
    expect(separado.ordens.get('a')!).toBeLessThan(4)
    expect(separado.ordens.get('c')!).toBeGreaterThan(4)
  })

  it('planejarOrdens pede para renumerar quando não cabe', () => {
    const plano = planejarOrdens(['a', 'x', 'b'], new Set(['x']), (id) => (id === 'x' ? 9 : 1))
    expect(plano).toEqual({ tipo: 'renumerar' })
  })
})
