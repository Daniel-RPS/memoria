import { describe, expect, it } from 'vitest'
import type { Category, Subcategory } from '@/db/types'
import {
  classificarTarefa,
  corDaSubcategoria,
  filtrarPorCategoria,
  montarCategorias,
  preencherOrdem,
  somarUso,
  textoDoUso,
} from '@/lib/categorias'
import { isCorValida, PALETA_CATEGORIAS, variacaoCor } from '@/lib/cores'

const base = { atualizadoEm: '' }
const casa: Category = {
  ...base,
  id: 'casa',
  nome: 'Casa',
  cor: '#3366c2',
  ordem: 1,
  criadoEm: '1',
}
const trabalho: Category = {
  ...base,
  id: 'trab',
  nome: 'trabalho',
  cor: '#c8402f',
  ordem: 2,
  criadoEm: '2',
}
const jardim: Subcategory = {
  ...base,
  id: 'jardim',
  categoryId: 'casa',
  nome: 'Jardim',
  ordem: 1,
  criadoEm: '3',
}
const cozinha: Subcategory = {
  ...base,
  id: 'cozinha',
  categoryId: 'casa',
  nome: 'Cozinha',
  ordem: 2,
  criadoEm: '4',
}
const contas: Subcategory = {
  ...base,
  id: 'contas',
  categoryId: 'casa',
  nome: 'Contas',
  cor: '#2f8a57',
  ordem: 3,
  criadoEm: '5',
}

const arvore = montarCategorias([trabalho, casa], [cozinha, contas, jardim])

describe('variacaoCor', () => {
  it('gera tons diferentes e válidos para posições vizinhas', () => {
    const tons = [0, 1, 2, 3].map((indice) => variacaoCor('#3366c2', indice))
    expect(new Set(tons).size).toBe(4)
    expect(tons.every(isCorValida)).toBe(true)
    expect(tons).not.toContain('#3366c2')
  })

  it('clareia na posição 0 e escurece na 1', () => {
    expect(variacaoCor('#000000', 0)).toBe('#4d4d4d')
    expect(variacaoCor('#ffffff', 1)).toBe('#c7c7c7')
  })

  it('a paleta só tem cores válidas e sem repetição', () => {
    const hexes = PALETA_CATEGORIAS.map((cor) => cor.hex)
    expect(hexes.every(isCorValida)).toBe(true)
    expect(new Set(hexes).size).toBe(hexes.length)
  })
})

describe('montarCategorias e cores de subcategoria', () => {
  it('ordena categorias e subcategorias pela ordem do usuário', () => {
    expect(arvore.map((categoria) => categoria.nome)).toEqual(['Casa', 'trabalho'])
    expect(arvore[0].subcategorias.map((sub) => sub.nome)).toEqual(['Jardim', 'Cozinha', 'Contas'])
  })

  it('usa a cor própria ou um tom estável pela ordem de criação', () => {
    expect(corDaSubcategoria(arvore[0], 'jardim')).toBe(variacaoCor('#3366c2', 0))
    expect(corDaSubcategoria(arvore[0], 'cozinha')).toBe(variacaoCor('#3366c2', 1))
    expect(corDaSubcategoria(arvore[0], 'contas')).toBe('#2f8a57')
  })

  it('a ordem do usuário vale mesmo contra o nome, e reordenar não troca os tons', () => {
    const invertida = montarCategorias(
      [
        { ...casa, ordem: 5 },
        { ...trabalho, ordem: 1 },
      ],
      [
        { ...jardim, ordem: 9 },
        { ...cozinha, ordem: 1 },
      ],
    )
    expect(invertida.map((categoria) => categoria.nome)).toEqual(['trabalho', 'Casa'])
    expect(invertida[1].subcategorias.map((sub) => sub.nome)).toEqual(['Cozinha', 'Jardim'])
    expect(corDaSubcategoria(invertida[1], 'jardim')).toBe(variacaoCor('#3366c2', 0))
  })
})

describe('classificarTarefa', () => {
  it('dá cor e rótulo da categoria ou da subcategoria', () => {
    expect(classificarTarefa({ categoryId: 'trab' }, arvore)).toEqual({
      cor: '#c8402f',
      rotulo: 'trabalho',
    })
    expect(classificarTarefa({ categoryId: 'casa', subcategoryId: 'jardim' }, arvore)).toEqual({
      cor: variacaoCor('#3366c2', 0),
      rotulo: 'Casa › Jardim',
    })
  })

  it('ignora categoria que não existe mais', () => {
    expect(classificarTarefa({ categoryId: 'sumiu' }, arvore)).toBeNull()
    expect(classificarTarefa({}, arvore)).toBeNull()
  })
})

describe('filtrarPorCategoria', () => {
  const tarefas = [
    { id: '1', categoryId: 'casa', subcategoryId: 'jardim' },
    { id: '2', categoryId: 'casa' },
    { id: '3', categoryId: 'trab' },
    { id: '4' },
  ]

  it('sem filtro mostra tudo', () => {
    expect(filtrarPorCategoria(tarefas, {})).toHaveLength(4)
  })

  it('categoria inclui todas as subcategorias dela', () => {
    expect(filtrarPorCategoria(tarefas, { categoriaId: 'casa' }).map((t) => t.id)).toEqual([
      '1',
      '2',
    ])
  })

  it('subcategoria mostra só ela', () => {
    expect(
      filtrarPorCategoria(tarefas, { categoriaId: 'casa', subcategoriaId: 'jardim' }).map(
        (t) => t.id,
      ),
    ).toEqual(['1'])
  })
})

describe('preencherOrdem', () => {
  const semOrdem = <T extends { ordem: number }>({ ordem: _ordem, ...resto }: T) => resto

  it('categorias por nome e subcategorias por criação, sem perder dados', () => {
    const { categorias, subcategorias } = preencherOrdem(
      [semOrdem(trabalho), semOrdem(casa)],
      [semOrdem(contas), semOrdem(jardim), semOrdem(cozinha)],
    )
    expect(categorias).toEqual([
      { ...trabalho, ordem: 2 },
      { ...casa, ordem: 1 },
    ])
    expect(subcategorias).toEqual(
      expect.arrayContaining([
        { ...jardim, ordem: 1 },
        { ...cozinha, ordem: 2 },
        { ...contas, ordem: 3 },
      ]),
    )
    expect(subcategorias).toHaveLength(3)
  })

  it('mantém quem já tem ordem e põe os outros depois', () => {
    const { categorias } = preencherOrdem([{ ...trabalho, ordem: 7 }, semOrdem(casa)], [])
    expect(categorias.map((categoria) => categoria.ordem)).toEqual([7, 8])
  })
})

describe('uso das categorias', () => {
  it('soma tarefas, grupos e procedimentos por categoria', () => {
    const uso = somarUso({
      tarefas: ['casa', 'casa', 'trab'],
      grupos: ['casa'],
      procedimentos: ['trab'],
    })
    expect(uso.get('casa')).toEqual({ tarefas: 2, grupos: 1, procedimentos: 0 })
    expect(uso.get('trab')).toEqual({ tarefas: 1, grupos: 0, procedimentos: 1 })
    expect(textoDoUso(uso.get('casa')!)).toBe('2 tarefas · 1 grupo')
    expect(textoDoUso({ tarefas: 4, grupos: 2, procedimentos: 1 })).toBe(
      '4 tarefas · 2 grupos · 1 procedimento',
    )
    expect(textoDoUso({ tarefas: 0, grupos: 0, procedimentos: 0 })).toBe('Sem uso')
  })
})
