import { describe, expect, it } from 'vitest'
import {
  adicionarAosRecentes,
  buscarMarcas,
  iconeValido,
  indexarMarcas,
  lerRecentes,
  RECENTES_NO_MAXIMO,
  resolverIcone,
  type MarcaDoIndice,
} from '@/lib/icones'

const MARCAS: MarcaDoIndice[] = [
  { t: 'GitHub', s: 'github', h: '181717' },
  { t: 'GitHub Actions', s: 'githubactions', h: '2088FF' },
  { t: 'Mercado Pago', s: 'mercadopago', h: '00B1EA' },
  { t: 'X', s: 'x', h: '000000', a: ['Twitter'] },
  { t: 'Docker', s: 'docker', h: '2496ED' },
]
const INDICE = indexarMarcas(MARCAS)

describe('iconeValido', () => {
  it('aceita emoji (com pele, ZWJ, bandeira e tecla) e slug de marca', () => {
    for (const valor of ['🏠', '👍🏽', '👩‍💻', '🇧🇷', '1️⃣', '❤️']) {
      expect(iconeValido({ tipo: 'emoji', valor })).toEqual({ tipo: 'emoji', valor })
    }
    expect(iconeValido({ tipo: 'marca', valor: 'github' })).toEqual({
      tipo: 'marca',
      valor: 'github',
    })
  })

  it('recusa texto comum, slug com caracteres estranhos e tipo desconhecido', () => {
    expect(iconeValido({ tipo: 'emoji', valor: 'casa' })).toBeUndefined()
    expect(iconeValido({ tipo: 'emoji', valor: '🏠 casa' })).toBeUndefined()
    expect(iconeValido({ tipo: 'emoji', valor: '' })).toBeUndefined()
    expect(iconeValido({ tipo: 'marca', valor: '../segredo' })).toBeUndefined()
    expect(iconeValido({ tipo: 'marca', valor: 'GitHub' })).toBeUndefined()
    expect(iconeValido({ tipo: 'foto', valor: 'x' })).toBeUndefined()
    expect(iconeValido(undefined)).toBeUndefined()
  })
})

describe('resolverIcone', () => {
  it('emoji é desenhado como está', () => {
    expect(resolverIcone({ tipo: 'emoji', valor: '🏠' }, undefined)).toEqual({
      tipo: 'emoji',
      emoji: '🏠',
    })
  })

  it('marca: nome e cor oficial do índice', () => {
    expect(resolverIcone({ tipo: 'marca', valor: 'github' }, INDICE)).toEqual({
      tipo: 'marca',
      slug: 'github',
      nome: 'GitHub',
      cor: '#181717',
    })
  })

  it('marca enquanto o índice carrega guarda o lugar', () => {
    expect(resolverIcone({ tipo: 'marca', valor: 'github' }, undefined)).toEqual({
      tipo: 'carregando',
      slug: 'github',
    })
  })

  it('slug que saiu da biblioteca cai no ícone neutro', () => {
    expect(resolverIcone({ tipo: 'marca', valor: 'linkedin' }, INDICE)).toEqual({
      tipo: 'neutro',
      slug: 'linkedin',
    })
  })
})

describe('buscarMarcas', () => {
  const slugs = (termo: string) => buscarMarcas(MARCAS, termo).map((marca) => marca.s)

  it('nome exato primeiro, depois quem começa pelo termo, depois quem contém', () => {
    expect(slugs('github')).toEqual(['github', 'githubactions'])
    expect(slugs('hub')).toEqual(['github', 'githubactions'])
  })

  it('ignora espaços, maiúsculas e acentos; acha por apelido', () => {
    expect(slugs('Mercado Pago')).toEqual(['mercadopago'])
    expect(slugs('twitter')).toEqual(['x'])
  })

  it('sem termo devolve a lista até o limite', () => {
    expect(buscarMarcas(MARCAS, '  ', 2)).toHaveLength(2)
  })
})

describe('recentes', () => {
  it('o último usado vai para o começo, sem repetir', () => {
    const casa = { tipo: 'emoji', valor: '🏠' } as const
    const github = { tipo: 'marca', valor: 'github' } as const
    expect(adicionarAosRecentes([casa, github], github)).toEqual([github, casa])
  })

  it('guarda no máximo o limite', () => {
    let recentes = adicionarAosRecentes([], { tipo: 'marca', valor: 'a0' })
    for (let indice = 1; indice <= RECENTES_NO_MAXIMO + 5; indice++) {
      recentes = adicionarAosRecentes(recentes, { tipo: 'marca', valor: `a${indice}` })
    }
    expect(recentes).toHaveLength(RECENTES_NO_MAXIMO)
  })

  it('lê o guardado e descarta o que estiver quebrado', () => {
    expect(
      lerRecentes('[{"tipo":"emoji","valor":"🏠"},{"tipo":"marca","valor":"../x"},5]'),
    ).toEqual([{ tipo: 'emoji', valor: '🏠' }])
    expect(lerRecentes('{quebrado')).toEqual([])
    expect(lerRecentes(null)).toEqual([])
  })
})
