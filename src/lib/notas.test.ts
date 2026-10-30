import { describe, expect, it } from 'vitest'
import { buscarNotas, tituloDaNota } from '@/lib/notas'

describe('notas', () => {
  it('usa o título, senão a primeira linha com texto, senão "Sem título"', () => {
    expect(tituloDaNota({ titulo: ' Ideias ', conteudo: 'x' })).toBe('Ideias')
    expect(tituloDaNota({ titulo: '', conteudo: '\n  Comprar tinta\nbranca' })).toBe(
      'Comprar tinta',
    )
    expect(tituloDaNota({ titulo: '', conteudo: '   ' })).toBe('Sem título')
  })

  it('busca no título e no texto, sem diferenciar acentos', () => {
    const notas = [
      { titulo: 'Reunião', conteudo: 'pauta do condomínio' },
      { titulo: 'Receitas', conteudo: 'pão de queijo' },
    ]
    expect(buscarNotas(notas, 'condominio')).toHaveLength(1)
    expect(buscarNotas(notas, 'reuniao pauta')).toHaveLength(1)
    expect(buscarNotas(notas, 'queijo reuniao')).toHaveLength(0)
    expect(buscarNotas(notas, '')).toHaveLength(2)
  })
})
