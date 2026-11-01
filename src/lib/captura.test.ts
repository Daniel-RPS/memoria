import { describe, expect, it } from 'vitest'
import {
  atalhosDeDia,
  dividirTexto,
  esquemaCaptura,
  itensPreenchidos,
  textoCapturado,
  textoItensAdicionados,
} from '@/lib/captura'
import { TAMANHO_MAXIMO_TITULO } from '@/lib/esquemas'

describe('captura rápida', () => {
  it('atalhos: hoje e amanhã', () => {
    expect(atalhosDeDia('2026-11-08').map((atalho) => atalho.data)).toEqual([
      '2026-11-08',
      '2026-11-09',
    ])
  })

  it('itens do grupo sem linhas vazias nem espaços nas pontas', () => {
    const itens = [{ titulo: ' Café ' }, { titulo: '' }, { titulo: '  ' }, { titulo: 'Pão' }]
    expect(itensPreenchidos(itens)).toEqual(['Café', 'Pão'])
  })

  it('tarefa: a 1ª linha é o título e as outras viram a anotação', () => {
    expect(dividirTexto('tarefa', '\n  Comprar tinta \nCor: areia\n\nDois galões\n\n')).toEqual({
      titulo: 'Comprar tinta',
      itens: [],
      anotacao: 'Cor: areia\n\nDois galões',
    })
    expect(dividirTexto('tarefa', 'Só o título')).toEqual({
      titulo: 'Só o título',
      itens: [],
      anotacao: '',
    })
  })

  it('grupo e "Em grupo…": a 1ª linha é o título e cada linha seguinte é um item', () => {
    const texto = 'Feira\r\n Banana \n\n  \nAlface'
    expect(dividirTexto('grupo', texto)).toEqual({
      titulo: 'Feira',
      itens: ['Banana', 'Alface'],
      anotacao: '',
    })
    expect(dividirTexto('em-grupo', texto)).toMatchObject({ titulo: 'Feira' })
  })

  it('valida título, itens e dia', () => {
    const base = { tipo: 'tarefa' as const, data: '2026-11-02' }
    expect(esquemaCaptura.safeParse({ ...base, texto: ' \n ' }).success).toBe(false)
    expect(esquemaCaptura.safeParse({ ...base, texto: 'Ok', data: '2026-02-30' }).success).toBe(
      false,
    )
    expect(esquemaCaptura.safeParse({ ...base, texto: ' Ok \nanotação' }).success).toBe(true)
    // A anotação não tem limite; os itens do grupo, sim.
    const longo = 'x'.repeat(TAMANHO_MAXIMO_TITULO + 1)
    expect(esquemaCaptura.safeParse({ ...base, texto: `Ok\n${longo}` }).success).toBe(true)
    const grupo = esquemaCaptura.safeParse({
      ...base,
      tipo: 'grupo',
      texto: `Feira\nOk\n${longo}`,
    })
    expect(grupo.error?.issues[0]).toMatchObject({
      path: ['texto'],
      message: `Item 2: Use no máximo ${TAMANHO_MAXIMO_TITULO} caracteres.`,
    })
  })

  it('"Em grupo…" exige o grupo escolhido', () => {
    const base = {
      tipo: 'em-grupo' as const,
      texto: 'Fazer lasanha',
      data: '2026-11-02',
    }
    const semGrupo = esquemaCaptura.safeParse(base)
    expect(semGrupo.success).toBe(false)
    expect(semGrupo.error?.issues[0]).toMatchObject({
      path: ['seriesId'],
      message: 'Escolha o grupo.',
    })
    expect(esquemaCaptura.safeParse({ ...base, seriesId: 'casa' }).success).toBe(true)
  })

  it('aviso depois de criar', () => {
    expect(textoCapturado('tarefa', '2026-11-03')).toBe('Tarefa criada para 03/11')
    expect(textoCapturado('grupo', '2026-11-03')).toBe('Grupo criado para 03/11')
    expect(textoItensAdicionados(1, 'Casa', '2026-11-01')).toBe('1 item adicionado a Casa · 01/11')
    expect(textoItensAdicionados(3, 'Casa', '2026-11-01')).toBe(
      '3 itens adicionados a Casa · 01/11',
    )
  })
})
