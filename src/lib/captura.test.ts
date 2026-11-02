import { describe, expect, it } from 'vitest'
import {
  atalhosDeDia,
  colarNoItem,
  dividirTexto,
  esquemaCaptura,
  inserirItemDepois,
  itensPreenchidos,
  primeiraLinha,
  removerItemVazio,
  semLinhasVaziasNoTopo,
  textoGrupoCriado,
  textoItensAdicionados,
  textoTarefaCriada,
  trocarPrimeiraLinha,
} from '@/lib/captura'
import { TAMANHO_MAXIMO_TITULO } from '@/lib/esquemas'

describe('captura rápida', () => {
  it('atalhos: hoje e amanhã', () => {
    expect(atalhosDeDia('2026-11-08').map((atalho) => atalho.data)).toEqual([
      '2026-11-08',
      '2026-11-09',
    ])
  })

  it('itens do grupo sem linhas vazias nem espaços nas pontas, na ordem', () => {
    expect(itensPreenchidos([' Café ', '', '  ', 'Pão'])).toEqual(['Café', 'Pão'])
  })

  it('tarefa: a 1ª linha é o título e as outras viram a anotação', () => {
    expect(dividirTexto('\n  Comprar tinta \nCor: areia\n\nDois galões\n\n')).toEqual({
      titulo: 'Comprar tinta',
      anotacao: 'Cor: areia\n\nDois galões',
    })
    expect(dividirTexto('Só o título')).toEqual({ titulo: 'Só o título', anotacao: '' })
  })

  it('trocar de modo: o nome do grupo é a 1ª linha do texto da tarefa, e a anotação fica', () => {
    const texto = semLinhasVaziasNoTopo('\n \nComprar tinta\nCor: areia')
    expect(texto).toBe('Comprar tinta\nCor: areia')
    expect(primeiraLinha(texto)).toBe('Comprar tinta')
    expect(trocarPrimeiraLinha(texto, 'Pintura')).toBe('Pintura\nCor: areia')
    expect(trocarPrimeiraLinha('', 'Casa')).toBe('Casa')
  })

  it('Enter num item abre a linha de baixo e foca nela', () => {
    expect(inserirItemDepois(['Café', 'Pão'], 0)).toEqual({ itens: ['Café', '', 'Pão'], foco: 1 })
  })

  it('Backspace num item vazio apaga a linha e volta para a anterior (ou o nome)', () => {
    expect(removerItemVazio(['Café', '', 'Pão'], 1)).toEqual({ itens: ['Café', 'Pão'], foco: 0 })
    expect(removerItemVazio(['', 'Pão'], 0)).toEqual({ itens: ['Pão'], foco: -1 })
    // A única linha fica: só o foco sobe para o nome.
    const unica = ['']
    expect(removerItemVazio(unica, 0)).toEqual({ itens: unica, foco: -1 })
  })

  it('colar várias linhas num item gera um item por linha, sem as vazias', () => {
    expect(
      colarNoItem(['Café', 'Pão'], 1, 'Banana\r\n\nAlface\nTomate\n', { inicio: 0, fim: 0 }),
    ).toEqual({ itens: ['Café', 'Banana', 'Alface', 'TomatePão'], foco: 3, cursor: 6 })
    // O que estava antes do cursor junta com a 1ª linha; a seleção é trocada.
    expect(colarNoItem(['Leite xx'], 0, ' de aveia\nOvos', { inicio: 5, fim: 8 })).toEqual({
      itens: ['Leite de aveia', 'Ovos'],
      foco: 1,
      cursor: 4,
    })
    expect(colarNoItem([''], 0, 'Uma linha só', { inicio: 0, fim: 0 })).toBeNull()
  })

  it('valida título da tarefa, nome do grupo, itens e dia', () => {
    const base = { tipo: 'tarefa' as const, itens: [''], data: '2026-11-02' }
    expect(esquemaCaptura.safeParse({ ...base, texto: ' \n ' }).success).toBe(false)
    expect(esquemaCaptura.safeParse({ ...base, texto: 'Ok', data: '2026-02-30' }).success).toBe(
      false,
    )
    expect(esquemaCaptura.safeParse({ ...base, texto: ' Ok \nanotação' }).success).toBe(true)
    // A anotação não tem limite; os itens do grupo, sim.
    const longo = 'x'.repeat(TAMANHO_MAXIMO_TITULO + 1)
    expect(esquemaCaptura.safeParse({ ...base, texto: `Ok\n${longo}` }).success).toBe(true)

    const grupo = { ...base, tipo: 'grupo' as const, texto: 'Feira' }
    expect(esquemaCaptura.safeParse(grupo).success).toBe(true)
    expect(esquemaCaptura.safeParse({ ...grupo, texto: ' ' }).error?.issues[0]).toMatchObject({
      path: ['texto'],
      message: 'Escreva um nome.',
    })
    const itemLongo = esquemaCaptura.safeParse({ ...grupo, itens: ['Ok', '', longo] })
    expect(itemLongo.error?.issues[0]).toMatchObject({
      path: ['itens'],
      message: `Item 3: Use no máximo ${TAMANHO_MAXIMO_TITULO} caracteres.`,
    })
  })

  it('"Em grupo…" exige o grupo escolhido e um item, e ignora o texto', () => {
    const base = {
      tipo: 'em-grupo' as const,
      texto: '',
      itens: ['Fazer lasanha'],
      data: '2026-11-02',
    }
    expect(esquemaCaptura.safeParse(base).error?.issues[0]).toMatchObject({
      path: ['seriesId'],
      message: 'Escolha o grupo.',
    })
    expect(esquemaCaptura.safeParse({ ...base, seriesId: 'casa' }).success).toBe(true)
    expect(
      esquemaCaptura.safeParse({ ...base, seriesId: 'casa', itens: ['', ' '] }).error?.issues[0],
    ).toMatchObject({ path: ['itens'], message: 'Escreva um item.' })
  })

  it('aviso depois de criar', () => {
    expect(textoTarefaCriada('2026-11-03')).toBe('Tarefa criada para 03/11')
    expect(textoGrupoCriado('Casa', 3, '2026-11-02')).toBe('Grupo Casa criado com 3 itens · 02/11')
    expect(textoGrupoCriado('Casa', 1, '2026-11-02')).toBe('Grupo Casa criado com 1 item · 02/11')
    expect(textoGrupoCriado('Casa', 0, '2026-11-02')).toBe('Grupo Casa criado · 02/11')
    expect(textoItensAdicionados(1, 'Casa', '2026-11-01')).toBe('1 item adicionado a Casa · 01/11')
    expect(textoItensAdicionados(3, 'Casa', '2026-11-01')).toBe(
      '3 itens adicionados a Casa · 01/11',
    )
  })
})
