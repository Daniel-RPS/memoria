import { describe, expect, it } from 'vitest'
import {
  atalhosDeDia,
  esquemaCaptura,
  itensPreenchidos,
  textoCapturado,
  textoItensAdicionados,
} from '@/lib/captura'

describe('captura rápida', () => {
  it('atalhos: hoje, amanhã e a segunda-feira da próxima semana', () => {
    // 2/11/2026 é segunda; 8/11 é domingo.
    expect(atalhosDeDia('2026-11-02').map((atalho) => atalho.data)).toEqual([
      '2026-11-02',
      '2026-11-03',
      '2026-11-09',
    ])
    expect(atalhosDeDia('2026-11-08').map((atalho) => atalho.data)).toEqual([
      '2026-11-08',
      '2026-11-09',
      '2026-11-09',
    ])
  })

  it('itens do grupo sem linhas vazias nem espaços nas pontas', () => {
    const itens = [{ titulo: ' Café ' }, { titulo: '' }, { titulo: '  ' }, { titulo: 'Pão' }]
    expect(itensPreenchidos(itens)).toEqual(['Café', 'Pão'])
  })

  it('valida título e dia', () => {
    const base = { tipo: 'tarefa' as const, itens: [] }
    expect(esquemaCaptura.safeParse({ ...base, titulo: '  ', data: '2026-11-02' }).success).toBe(
      false,
    )
    expect(esquemaCaptura.safeParse({ ...base, titulo: 'Ok', data: '2026-02-30' }).success).toBe(
      false,
    )
    expect(esquemaCaptura.safeParse({ ...base, titulo: ' Ok ', data: '2026-11-02' })).toMatchObject(
      { success: true, data: { titulo: 'Ok' } },
    )
  })

  it('"Em grupo…" exige o grupo escolhido', () => {
    const base = {
      tipo: 'em-grupo' as const,
      titulo: 'Fazer lasanha',
      data: '2026-11-02',
      itens: [],
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
