import { describe, expect, it } from 'vitest'
import type { Category, Subcategory } from '@/db/types'
import {
  classificarTarefa,
  corDaSubcategoria,
  montarCategorias,
  preencherOrdem,
  separarPorTipo,
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
  tipo: 'grupo',
  ordem: 1,
  criadoEm: '1',
}
const trabalho: Category = {
  ...base,
  id: 'trab',
  nome: 'trabalho',
  cor: '#c8402f',
  tipo: 'grupo',
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

describe('separarPorTipo (migração v9 e backup antigo)', () => {
  const comum = { criadoEm: '1', atualizadoEm: '1' }
  const semTipo = (id: string, nome: string, ordem: number) => ({
    ...comum,
    id,
    nome,
    cor: '#3366c2',
    ordem,
  })
  const subGithub: Subcategory = {
    ...comum,
    id: 'sub',
    categoryId: 'github',
    nome: 'Ações',
    cor: '#2f8a57',
    ordem: 1,
  }

  it('classifica pelo uso: só grupo, só procedimento e sem uso', () => {
    const resultado = separarPorTipo({
      categorias: [
        semTipo('casa', 'Casa', 1),
        semTipo('receitas', 'Receitas', 2),
        semTipo('vazia', 'Vazia', 3),
        semTipo('trabalho', 'Trabalho', 4),
      ],
      subcategorias: [],
      tarefas: [{ categoryId: 'casa' }],
      grupos: [{ categoryId: 'trabalho' }],
      procedimentos: [{ categoryId: 'receitas' }],
    })
    expect(resultado.categorias.map(({ id, tipo, ordem }) => ({ id, tipo, ordem }))).toEqual([
      { id: 'casa', tipo: 'grupo', ordem: 1 },
      { id: 'receitas', tipo: 'procedimento', ordem: 1 },
      { id: 'vazia', tipo: 'grupo', ordem: 2 },
      { id: 'trabalho', tipo: 'grupo', ordem: 3 },
    ])
    expect(resultado.subcategorias).toEqual([])
  })

  it('usada pelos dois: divide em duas (mesmo nome e cor), copia subcategorias e religa', () => {
    const procedimento = { id: 'p', categoryId: 'github', subcategoryId: 'sub' }
    const semSub = { id: 'p2', categoryId: 'github' }
    const resultado = separarPorTipo({
      categorias: [semTipo('github', 'Github', 1)],
      subcategorias: [subGithub],
      tarefas: [{ categoryId: 'github', subcategoryId: 'sub' }],
      grupos: [],
      procedimentos: [procedimento, semSub],
    })
    const [original, copia] = resultado.categorias
    expect(original).toMatchObject({ id: 'github', nome: 'Github', tipo: 'grupo', ordem: 1 })
    expect(copia).toMatchObject({ nome: 'Github', cor: '#3366c2', tipo: 'procedimento', ordem: 1 })
    expect(copia.id).not.toBe('github')

    const subcopia = resultado.subcategorias.find((item) => item.id !== 'sub')
    expect(resultado.subcategorias).toHaveLength(2)
    expect(subcopia).toMatchObject({ categoryId: copia.id, nome: 'Ações', cor: '#2f8a57' })
    expect(resultado.procedimentos).toEqual([
      { id: 'p', categoryId: copia.id, subcategoryId: subcopia?.id },
      { id: 'p2', categoryId: copia.id },
    ])
  })

  it('quem já tem tipo fica como está', () => {
    const categorias = [{ ...casa }, { ...trabalho, tipo: 'procedimento' as const }]
    const resultado = separarPorTipo({
      categorias,
      subcategorias: [],
      tarefas: [{ categoryId: 'trab' }],
      grupos: [],
      procedimentos: [],
    })
    expect(resultado.categorias).toBe(categorias)
  })
})
