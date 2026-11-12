import { describe, expect, it } from 'vitest'
import { contagemDasSoltas, lerModoDoDia, lerOrdemDoDia, secoesNaOrdem } from '@/lib/visao-do-dia'

describe('visão do dia', () => {
  it('lê modo e ordem com padrão Lista e Grupos primeiro', () => {
    expect(lerModoDoDia(null)).toBe('lista')
    expect(lerModoDoDia('colunas')).toBe('colunas')
    expect(lerModoDoDia('cartoes')).toBe('cartoes')
    expect(lerModoDoDia('outro')).toBe('lista')
    expect(lerOrdemDoDia(null)).toBe('grupos')
    expect(lerOrdemDoDia('soltas')).toBe('soltas')
  })

  it('põe as seções na ordem escolhida', () => {
    expect(secoesNaOrdem('grupos')).toEqual(['grupos', 'soltas'])
    expect(secoesNaOrdem('soltas')).toEqual(['soltas', 'grupos'])
  })

  it('conta as soltas como pendentes/total só quando há concluídas', () => {
    expect(contagemDasSoltas(1, 0)).toEqual({ texto: '1', rotulo: '1 pendente de 1' })
    expect(contagemDasSoltas(1, 2)).toEqual({ texto: '1/3', rotulo: '1 pendente de 3' })
    expect(contagemDasSoltas(0, 0)).toEqual({ texto: '0', rotulo: 'nenhuma' })
  })
})
