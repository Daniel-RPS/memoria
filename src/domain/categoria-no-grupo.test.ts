import { describe, expect, it } from 'vitest'
import {
  montarAviso,
  mudancaAoEntrarNoGrupo,
  mudancaAoSairDoGrupo,
  textoDoAviso,
  type AvisoDeCategoria,
} from '@/domain/categoria-no-grupo'

const NOMES = new Map([
  ['trabalho', 'Trabalho'],
  ['casa', 'Casa'],
])

describe('mudancaAoEntrarNoGrupo', () => {
  it('categoria A → grupo da categoria B: avisa (A → B)', () => {
    expect(mudancaAoEntrarNoGrupo({ categoryId: 'trabalho' }, { categoryId: 'casa' })).toEqual({
      de: { categoryId: 'trabalho' },
      para: { categoryId: 'casa' },
    })
  })

  it('categoria A → grupo sem categoria: avisa (A → sem categoria)', () => {
    const mudanca = mudancaAoEntrarNoGrupo({ categoryId: 'trabalho' }, {})
    expect(mudanca?.de.categoryId).toBe('trabalho')
    expect(mudanca?.para.categoryId).toBeUndefined()
  })

  it('categoria A → grupo da categoria A: sem aviso', () => {
    expect(mudancaAoEntrarNoGrupo({ categoryId: 'trabalho' }, { categoryId: 'trabalho' })).toBe(
      null,
    )
  })

  it('tarefa sem categoria → qualquer grupo: sem aviso', () => {
    expect(mudancaAoEntrarNoGrupo({}, { categoryId: 'casa' })).toBe(null)
    expect(mudancaAoEntrarNoGrupo({}, {})).toBe(null)
  })
})

describe('mudancaAoSairDoGrupo', () => {
  it('avisa só se o grupo tinha categoria', () => {
    expect(mudancaAoSairDoGrupo({ categoryId: 'casa' })?.para).toEqual({})
    expect(mudancaAoSairDoGrupo({})).toBe(null)
  })
})

describe('textoDoAviso', () => {
  const entrou = (titulo: string, de: object, para: object): AvisoDeCategoria =>
    montarAviso('entrou', titulo, 'Casa', { de, para }, NOMES)

  it('cita a tarefa, o grupo e a categoria perdida', () => {
    expect(
      textoDoAviso([
        entrou('Ligar para Fulano', { categoryId: 'trabalho' }, { categoryId: 'casa' }),
      ]),
    ).toBe('"Ligar para Fulano" foi para o grupo Casa e deixou a categoria Trabalho.')
  })

  it('grupo sem categoria: ficou sem categoria', () => {
    expect(textoDoAviso([entrou('Ligar para Fulano', { categoryId: 'trabalho' }, {})])).toBe(
      '"Ligar para Fulano" foi para o grupo Casa e ficou sem categoria.',
    )
  })

  it('saiu do grupo com categoria', () => {
    const aviso = montarAviso(
      'saiu',
      'Lavar',
      'Casa',
      { de: { categoryId: 'casa' }, para: {} },
      NOMES,
    )
    expect(textoDoAviso([aviso])).toBe('"Lavar" saiu do grupo Casa e ficou sem categoria.')
  })

  it('várias: um texto só com a contagem; nenhuma: null', () => {
    const a = entrou('A', { categoryId: 'trabalho' }, {})
    const b = entrou('B', { categoryId: 'casa' }, {})
    const c = entrou('C', { categoryId: 'trabalho' }, {})
    expect(textoDoAviso([a, b, c])).toBe('3 tarefas deixaram suas categorias.')
    expect(textoDoAviso([])).toBe(null)
  })
})
