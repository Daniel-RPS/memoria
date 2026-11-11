import { describe, expect, it } from 'vitest'
import { linksDoTexto, linksUnicos, rotuloCurtoDoLink, separarLinks } from './links'

function juntar(texto: string): string {
  return separarLinks(texto)
    .map((pedaco) => pedaco.texto)
    .join('')
}

describe('separarLinks', () => {
  it('tira o ")" final quando o "(" está fora do link', () => {
    const texto =
      'Abra Deploy Poose (Hostinger) (https://github.com/Daniel-RPS/Projeto-Poose/actions/workflows/deploy-hostinger.yml) e execute'
    expect(linksDoTexto(texto)).toEqual([
      {
        texto:
          'https://github.com/Daniel-RPS/Projeto-Poose/actions/workflows/deploy-hostinger.yml',
        href: 'https://github.com/Daniel-RPS/Projeto-Poose/actions/workflows/deploy-hostinger.yml',
      },
    ])
    expect(juntar(texto)).toBe(texto)
  })

  it('mantém reticências no meio e tira o ")" final', () => {
    const texto =
      '(Ver migrations novas: https://github.com/Daniel-RPS/Projeto-Poose/compare/b4c3bf7...main)'
    expect(linksDoTexto(texto).map((link) => link.texto)).toEqual([
      'https://github.com/Daniel-RPS/Projeto-Poose/compare/b4c3bf7...main',
    ])
  })

  it('tira ")." do final', () => {
    expect(
      linksDoTexto('https://hpanel.hostinger.com/websites/poose.tech/files/backups).')[0]?.texto,
    ).toBe('https://hpanel.hostinger.com/websites/poose.tech/files/backups')
  })

  it('reticências no fim não fazem parte do link', () => {
    expect(linksDoTexto('veja https://poose.tech/a...')[0]?.texto).toBe('https://poose.tech/a')
  })

  it('aceita www. e domínio sem protocolo, com href https', () => {
    const markdown = linksDoTexto('[www.poose.tech](https://www.poose.tech)')
    expect(markdown[0]).toEqual({ texto: 'www.poose.tech', href: 'https://www.poose.tech' })
    expect(markdown.every((link) => link.href === 'https://www.poose.tech')).toBe(true)

    expect(linksDoTexto('github.com/Daniel-RPS/memoria')).toEqual([
      { texto: 'github.com/Daniel-RPS/memoria', href: 'https://github.com/Daniel-RPS/memoria' },
    ])
    expect(linksDoTexto('site poose.tech, ok')[0]?.href).toBe('https://poose.tech')
  })

  it('mantém o ")" quando há "(" dentro do link', () => {
    const endereco = 'https://pt.wikipedia.org/wiki/Teste_(informática)'
    expect(linksDoTexto(endereco)).toEqual([{ texto: endereco, href: endereco }])
  })

  it('acha dois links na mesma linha, no início e no fim', () => {
    const texto = 'https://a.com/x e depois www.b.com.br'
    const pedacos = separarLinks(texto)
    expect(pedacos.map((pedaco) => pedaco.tipo)).toEqual(['link', 'texto', 'link'])
    expect(pedacos[2]).toEqual({ tipo: 'link', texto: 'www.b.com.br', href: 'https://www.b.com.br' })
    expect(juntar(texto)).toBe(texto)
  })

  it('texto sem link devolve um pedaço só', () => {
    expect(separarLinks('Comprar pão e leite.')).toEqual([
      { tipo: 'texto', texto: 'Comprar pão e leite.' },
    ])
  })

  it.each([
    'README.md',
    'deploy-hostinger.yml',
    'index.js',
    'v1.2.3',
    '3.5',
    'fulano@gmail.com',
    'database_backup_confirmed',
    'u557105254_poose_prod',
    'javascript:alert(1)',
    'data:text/html,oi',
    'http://',
  ])('não vira link: %s', (texto) => {
    expect(linksDoTexto(texto)).toEqual([])
  })
})

describe('rotuloCurtoDoLink', () => {
  it('mostra domínio e o último trecho do caminho', () => {
    expect(
      rotuloCurtoDoLink(
        'https://github.com/Daniel-RPS/Projeto-Poose/actions/workflows/deploy-hostinger.yml',
      ),
    ).toBe('github.com/…/deploy-hostinger.yml')
    expect(rotuloCurtoDoLink('https://www.poose.tech')).toBe('poose.tech')
    expect(rotuloCurtoDoLink('https://poose.tech/precos')).toBe('poose.tech/precos')
  })

  it('linksUnicos não repete o mesmo endereço', () => {
    expect(linksUnicos('www.poose.tech e https://www.poose.tech')).toHaveLength(1)
  })
})
