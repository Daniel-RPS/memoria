import { describe, it, expect, beforeEach, vi } from 'vitest'
import { z } from 'zod'
import { lerRascunho, gravarRascunho, limparRascunho, temRascunho } from './rascunhos'

describe('lib/rascunhos', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('grava e lê um rascunho corretamente', () => {
    gravarRascunho('teste', { texto: 'olá' })
    expect(temRascunho('teste')).toBe(true)

    const esquema = z.object({ texto: z.string() })
    const lido = lerRascunho('teste', esquema)
    expect(lido).toEqual({ texto: 'olá' })
  })

  it('expira após 7 dias', () => {
    const seteDiasMaisUmMs = 7 * 24 * 60 * 60 * 1000 + 1
    const agora = Date.now()

    vi.spyOn(Date, 'now').mockReturnValue(agora - seteDiasMaisUmMs)
    gravarRascunho('antigo', 'conteudo')

    vi.spyOn(Date, 'now').mockReturnValue(agora)
    expect(temRascunho('antigo')).toBe(false)
    expect(lerRascunho('antigo', z.string())).toBeNull()
    // Deve ter limpado a chave
    expect(localStorage.getItem('memoria:rascunho:antigo')).toBeNull()
  })

  it('retorna null e apaga quando JSON estiver quebrado', () => {
    localStorage.setItem('memoria:rascunho:quebrado', '{ quebrado')
    expect(temRascunho('quebrado')).toBe(false)
    expect(lerRascunho('quebrado', z.string())).toBeNull()
    expect(localStorage.getItem('memoria:rascunho:quebrado')).toBeNull()
  })

  it('limpa rascunho com limparRascunho', () => {
    gravarRascunho('limpar-me', 'algo')
    expect(temRascunho('limpar-me')).toBe(true)
    limparRascunho('limpar-me')
    expect(temRascunho('limpar-me')).toBe(false)
    expect(lerRascunho('limpar-me', z.string())).toBeNull()
  })

  it('não quebra quando localStorage lança erro', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceeded')
    })
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })

    expect(() => gravarRascunho('erro', 'algo')).not.toThrow()
    expect(lerRascunho('erro', z.string())).toBeNull()
    expect(temRascunho('erro')).toBe(false)
  })
})
