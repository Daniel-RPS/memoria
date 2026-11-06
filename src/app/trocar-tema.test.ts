import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { aplicarTemaNoHtml, depoisDaTroca } from '@/app/trocar-tema'

const raiz = document.documentElement

beforeEach(() => {
  raiz.dataset.tema = 'claro'
})

afterEach(() => vi.restoreAllMocks())

describe('aplicarTemaNoHtml', () => {
  it('troca na hora, sem transição', () => {
    aplicarTemaNoHtml('escuro')
    expect(raiz.dataset.tema).toBe('escuro')
  })

  it('cliques rápidos seguidos terminam no último tema', () => {
    for (const tema of ['escuro', 'claro', 'escuro', 'claro', 'escuro'] as const) {
      aplicarTemaNoHtml(tema)
    }
    expect(raiz.dataset.tema).toBe('escuro')
  })
})

describe('depoisDaTroca', () => {
  it('roda depois, fora do clique', async () => {
    const tarefa = vi.fn()
    depoisDaTroca(tarefa)
    expect(tarefa).not.toHaveBeenCalled()
    await new Promise((resolver) => setTimeout(resolver, 20))
    expect(tarefa).toHaveBeenCalledOnce()
  })

  it('se a página sair antes, roda na saída (e só uma vez)', async () => {
    const tarefa = vi.fn()
    depoisDaTroca(tarefa)
    window.dispatchEvent(new Event('pagehide'))
    expect(tarefa).toHaveBeenCalledOnce()
    await new Promise((resolver) => setTimeout(resolver, 20))
    expect(tarefa).toHaveBeenCalledOnce()
  })
})
