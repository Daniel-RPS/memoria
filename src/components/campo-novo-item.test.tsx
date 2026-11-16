import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CampoNovoItem } from './campo-novo-item'
import { temRascunho } from '@/lib/rascunhos'

describe('CampoNovoItem com rascunho', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('digitar, desmontar e montar de novo restaura o texto; criar remove o rascunho', async () => {
    const usuario = userEvent.setup()
    const onCriar = vi.fn().mockResolvedValue(undefined)

    const { unmount } = render(
      <CampoNovoItem
        rotulo="Nova tarefa"
        chaveRascunho="teste-tarefa"
        onCriar={onCriar}
      />,
    )

    const campo = screen.getByRole('textbox', { name: 'Nova tarefa' })
    await usuario.type(campo, 'Comprar leite')

    // Desmontar força o flush imediato
    unmount()

    expect(temRascunho('teste-tarefa')).toBe(true)

    // Montar de novo com a mesma chave
    render(
      <CampoNovoItem
        rotulo="Nova tarefa"
        chaveRascunho="teste-tarefa"
        onCriar={onCriar}
      />,
    )

    const campoRestaurado = screen.getByRole('textbox', { name: 'Nova tarefa' })
    expect(campoRestaurado).toHaveValue('Comprar leite')

    // Submeter com Enter
    await usuario.type(campoRestaurado, '{Enter}')

    expect(onCriar).toHaveBeenCalledWith('Comprar leite')
    expect(temRascunho('teste-tarefa')).toBe(false)
  })
})
