import { describe, expect, it } from 'vitest'
import type { Category } from '@/db/types'
import {
  classificarTarefa,
  maesDasSubcategorias,
  montarCategorias,
  preencherOrdem,
  religarACategoriaMae,
  separarPorTipo,
  somarUso,
  textoDoUso,
} from '@/lib/categorias'
import { isCorValida, PALETA_CATEGORIAS } from '@/lib/cores'

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

const categorias = montarCategorias([trabalho, casa])

describe('paleta', () => {
  it('a paleta só tem cores válidas e sem repetição', () => {
    const hexes = PALETA_CATEGORIAS.map((cor) => cor.hex)
    expect(hexes.every(isCorValida)).toBe(true)
    expect(new Set(hexes).size).toBe(hexes.length)
  })
})

describe('montarCategorias', () => {
  it('ordena as categorias pela ordem do usuário', () => {
    expect(categorias.map((categoria) => categoria.nome)).toEqual(['Casa', 'trabalho'])
  })

  it('a ordem do usuário vale mesmo contra o nome', () => {
    const invertida = montarCategorias([
      { ...casa, ordem: 5 },
      { ...trabalho, ordem: 1 },
    ])
    expect(invertida.map((categoria) => categoria.nome)).toEqual(['trabalho', 'Casa'])
  })
})

describe('classificarTarefa', () => {
  it('dá cor, rótulo e ícone da categoria', () => {
    expect(classificarTarefa({ categoryId: 'trab' }, categorias)).toEqual({
      cor: '#c8402f',
      rotulo: 'trabalho',
    })
  })

  it('ignora categoria que não existe mais', () => {
    expect(classificarTarefa({ categoryId: 'sumiu' }, categorias)).toBeNull()
    expect(classificarTarefa({}, categorias)).toBeNull()
  })
})

describe('religarACategoriaMae (migração v13 e backup antigo)', () => {
  const maeDe = maesDasSubcategorias([
    { id: 'jardim', categoryId: 'casa' },
    { id: 'reunioes', categoryId: 'trab' },
  ])

  it('item com subcategoria passa a usar só a categoria-mãe', () => {
    expect(
      religarACategoriaMae({ id: 't', categoryId: 'casa', subcategoryId: 'jardim' }, maeDe),
    ).toEqual({ id: 't', categoryId: 'casa' })
  })

  it('subcategoria sem a categoria gravada ganha a mãe', () => {
    expect(religarACategoriaMae({ id: 't', subcategoryId: 'reunioes' }, maeDe)).toEqual({
      id: 't',
      categoryId: 'trab',
    })
  })

  it('item só com categoria fica intacto', () => {
    expect(religarACategoriaMae({ id: 't', categoryId: 'casa' }, maeDe)).toEqual({
      id: 't',
      categoryId: 'casa',
    })
  })

  it('item sem categoria fica intacto (subcategoria desconhecida também não inventa categoria)', () => {
    const semCategoria: { id: string; categoryId?: string } = { id: 't' }
    expect(religarACategoriaMae(semCategoria, maeDe)).toEqual({ id: 't' })
    expect(religarACategoriaMae({ id: 't', subcategoryId: 'sumiu' }, maeDe)).toEqual({ id: 't' })
  })
})

describe('preencherOrdem', () => {
  const semOrdem = <T extends { ordem: number }>({ ordem: _ordem, ...resto }: T) => resto

  it('categorias sem ordem ficam em ordem alfabética, sem perder dados', () => {
    expect(preencherOrdem([semOrdem(trabalho), semOrdem(casa)])).toEqual([
      { ...trabalho, ordem: 2 },
      { ...casa, ordem: 1 },
    ])
  })

  it('mantém quem já tem ordem e põe os outros depois', () => {
    const resultado = preencherOrdem([{ ...trabalho, ordem: 7 }, semOrdem(casa)])
    expect(resultado.map((categoria) => categoria.ordem)).toEqual([7, 8])
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

  it('classifica pelo uso: só grupo, só procedimento e sem uso', () => {
    const resultado = separarPorTipo({
      categorias: [
        semTipo('casa', 'Casa', 1),
        semTipo('receitas', 'Receitas', 2),
        semTipo('vazia', 'Vazia', 3),
        semTipo('trabalho', 'Trabalho', 4),
      ],
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
  })

  it('usada pelos dois: divide em duas (mesmo nome e cor) e religa os procedimentos', () => {
    const resultado = separarPorTipo({
      categorias: [semTipo('github', 'Github', 1)],
      tarefas: [{ categoryId: 'github' }],
      grupos: [],
      procedimentos: [{ id: 'p', categoryId: 'github' }],
    })
    const [original, copia] = resultado.categorias
    expect(original).toMatchObject({ id: 'github', nome: 'Github', tipo: 'grupo', ordem: 1 })
    expect(copia).toMatchObject({ nome: 'Github', cor: '#3366c2', tipo: 'procedimento', ordem: 1 })
    expect(copia.id).not.toBe('github')
    expect(resultado.procedimentos).toEqual([{ id: 'p', categoryId: copia.id }])
  })

  it('quem já tem tipo fica como está', () => {
    const lista = [{ ...casa }, { ...trabalho, tipo: 'procedimento' as const }]
    const resultado = separarPorTipo({
      categorias: lista,
      tarefas: [{ categoryId: 'trab' }],
      grupos: [],
      procedimentos: [],
    })
    expect(resultado.categorias).toBe(lista)
  })
})
