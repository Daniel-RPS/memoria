import { act, fireEvent, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CHAVE_FUNDO, CHAVE_TEMA, useAparencia } from '@/app/use-aparencia'
import { useAplicarTema } from '@/app/use-aplicar-tema'
import { simularMidia } from '@/test/midia'

const SISTEMA_ESCURO = '(prefers-color-scheme: dark)'

beforeEach(() => {
  localStorage.clear()
  delete document.documentElement.dataset.tema
})

afterEach(async () => {
  // Gravações pendentes rodam aqui, ainda com os mocks do teste, e não vazam para o próximo.
  await rodarGravacao()
  vi.restoreAllMocks()
})

/** A gravação roda depois da troca (fora do caminho crítico). */
async function rodarGravacao() {
  await act(() => new Promise((resolver) => setTimeout(resolver, 20)))
}

describe('useAparencia', () => {
  it('começa em Sistema (claro, com o sistema claro) e com o fundo Aurora', () => {
    const { result } = renderHook(() => useAparencia())
    expect(result.current.escolhaTema).toBe('sistema')
    expect(result.current.tema).toBe('claro')
    expect(result.current.fundo).toBe('aurora')
  })

  it('lembra o tema e o fundo escolhidos entre sessões', async () => {
    const primeira = renderHook(() => useAparencia())
    act(() => {
      primeira.result.current.handleEscolherTema('escuro')
      primeira.result.current.handleEscolherFundo('liso')
    })
    await rodarGravacao()
    expect(primeira.result.current.tema).toBe('escuro')
    expect(localStorage.getItem(CHAVE_TEMA)).toBe('escuro')
    expect(localStorage.getItem(CHAVE_FUNDO)).toBe('liso')
    primeira.unmount()

    const segunda = renderHook(() => useAparencia())
    expect(segunda.result.current.escolhaTema).toBe('escuro')
    expect(segunda.result.current.fundo).toBe('liso')
  })

  it('em Sistema, acompanha a troca do sistema operacional na hora', () => {
    const { result } = renderHook(() => useAparencia())
    act(() => simularMidia(SISTEMA_ESCURO, true))
    expect(result.current.tema).toBe('escuro')
    act(() => simularMidia(SISTEMA_ESCURO, false))
    expect(result.current.tema).toBe('claro')
  })

  it('com Claro ou Escuro escolhido, ignora o sistema', () => {
    localStorage.setItem(CHAVE_TEMA, 'claro')
    const { result } = renderHook(() => useAparencia())
    act(() => simularMidia(SISTEMA_ESCURO, true))
    expect(result.current.tema).toBe('claro')
  })

  it('segue a troca feita em outra aba (evento storage)', () => {
    const { result } = renderHook(() => useAparencia())
    act(() => {
      localStorage.setItem(CHAVE_TEMA, 'escuro')
      window.dispatchEvent(new StorageEvent('storage', { key: CHAVE_TEMA }))
    })
    expect(result.current.tema).toBe('escuro')
  })

  it('valor estranho guardado ou armazenamento bloqueado voltam ao padrão', () => {
    localStorage.setItem(CHAVE_TEMA, 'roxo')
    localStorage.setItem(CHAVE_FUNDO, 'estrelas')
    expect(renderHook(() => useAparencia()).result.current).toMatchObject({
      escolhaTema: 'sistema',
      fundo: 'aurora',
    })

    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado')
    })
    const { result } = renderHook(() => useAparencia())
    expect(result.current.escolhaTema).toBe('sistema')
    expect(() => act(() => result.current.handleEscolherTema('escuro'))).not.toThrow()
  })

  it('aplica o tema no <html> na hora e só depois grava e avisa (não bloqueia a troca)', async () => {
    document.documentElement.dataset.tema = 'claro'
    const gravar = vi.spyOn(Storage.prototype, 'setItem')
    const { result } = renderHook(() => useAparencia())
    act(() => result.current.handleEscolherTema('escuro'))
    expect(document.documentElement.dataset.tema).toBe('escuro')
    expect(gravar).not.toHaveBeenCalled()
    expect(result.current.escolhaTema).toBe('sistema')
    await rodarGravacao()
    expect(localStorage.getItem(CHAVE_TEMA)).toBe('escuro')
    expect(result.current.escolhaTema).toBe('escuro')
  })

  it('com o armazenamento bloqueado, o tema troca mesmo assim', async () => {
    document.documentElement.dataset.tema = 'claro'
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado')
    })
    const { result } = renderHook(() => useAparencia())
    act(() => result.current.handleEscolherTema('escuro'))
    await rodarGravacao()
    expect(document.documentElement.dataset.tema).toBe('escuro')
  })

  it('"Sistema" escolhido no seletor resolve pelo sistema operacional na hora', () => {
    localStorage.setItem(CHAVE_TEMA, 'claro')
    document.documentElement.dataset.tema = 'claro'
    act(() => simularMidia(SISTEMA_ESCURO, true))
    const { result } = renderHook(() => useAparencia())
    act(() => result.current.handleEscolherTema('sistema'))
    expect(document.documentElement.dataset.tema).toBe('escuro')
    act(() => simularMidia(SISTEMA_ESCURO, false))
  })
})

describe('useAplicarTema', () => {
  it('leva o tema ao <html> e Ctrl+Shift+L alterna entre claro e escuro', async () => {
    renderHook(() => useAplicarTema())
    expect(document.documentElement.dataset.tema).toBe('claro')

    act(() => {
      fireEvent.keyDown(window, { key: 'L', ctrlKey: true, shiftKey: true })
    })
    expect(document.documentElement.dataset.tema).toBe('escuro')
    await rodarGravacao()
    expect(localStorage.getItem(CHAVE_TEMA)).toBe('escuro')

    act(() => {
      fireEvent.keyDown(window, { key: 'L', ctrlKey: true, shiftKey: true })
    })
    expect(document.documentElement.dataset.tema).toBe('claro')
  })
})

describe('useAplicarTema fora do seletor', () => {
  it('em Sistema, a troca do sistema operacional chega ao <html>', () => {
    renderHook(() => useAplicarTema())
    expect(document.documentElement.dataset.tema).toBe('claro')
    act(() => simularMidia(SISTEMA_ESCURO, true))
    expect(document.documentElement.dataset.tema).toBe('escuro')
    act(() => simularMidia(SISTEMA_ESCURO, false))
    expect(document.documentElement.dataset.tema).toBe('claro')
  })

  it('a troca feita em outra aba chega ao <html>', () => {
    renderHook(() => useAplicarTema())
    act(() => {
      localStorage.setItem(CHAVE_TEMA, 'escuro')
      window.dispatchEvent(new StorageEvent('storage', { key: CHAVE_TEMA }))
    })
    expect(document.documentElement.dataset.tema).toBe('escuro')
  })
})
