#!/usr/bin/env node
/**
 * Conta quantas vezes cada token de cor do MemorIA é referenciado no código de `src/`.
 *
 * Método: procura classes Tailwind que usam o token (`bg-caneta`, `text-tinta/60`,
 * `hover:bg-accent`, `bg-[color-mix(...var(--caneta)...)]`...) e `var(--token)` em .ts, .tsx e
 * .css. Ignora testes (`*.test.*`, `src/test/`) e as linhas do `index.css` que só DEFINEM um
 * token (`--x: ...`). Classe com `dark:` conta só no tema escuro; as demais contam nos dois.
 * Cores de categoria não entram (vêm do banco). Também lista os hex fixos encontrados.
 *
 * Uso (na raiz do projeto): node docs/branding/scripts/contar-cores.mjs [--json]
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const RAIZ = process.cwd()
const PASTA = join(RAIZ, 'src')

/** Tokens de cor do tema (src/index.css) e, para os aliases, a cor-base que eles usam. */
const ALIAS = {
  background: 'nevoa',
  foreground: 'tinta',
  card: 'papel',
  'card-foreground': 'tinta',
  popover: 'papel (claro) / próprio (escuro)',
  'popover-foreground': 'tinta',
  primary: 'caneta',
  'primary-foreground': 'próprio',
  secondary: 'próprio',
  'secondary-foreground': 'tinta',
  muted: 'próprio',
  'muted-foreground': 'grafite',
  accent: 'próprio',
  'accent-foreground': 'tinta',
  destructive: 'próprio',
  border: 'pauta',
  input: 'próprio',
  ring: 'caneta',
  'barra-borda': 'pauta',
  'barra-texto': 'tinta',
  'barra-suave': 'grafite',
}
const TOKENS = [
  'nevoa',
  'papel',
  'tinta',
  'grafite',
  'pauta',
  'caneta',
  'violeta-profundo',
  'marca-texto',
  'alerta',
  'barra',
  'barra-borda',
  'barra-texto',
  'barra-suave',
  'barra-realce',
  ...Object.keys(ALIAS).filter((nome) => !nome.startsWith('barra')),
  'fundo-mancha-1',
  'fundo-mancha-2',
  'fundo-mancha-3',
  'fundo-ponto',
  'fundo-linha',
  'fundo-brilho',
  'fundo-holofote',
]

const UTILITARIOS =
  'bg|text|border|border-[trblxyse]|outline|ring|ring-offset|fill|stroke|decoration|divide|from|via|to|accent|caret|placeholder|shadow'
// Do mais longo para o mais curto, para `barra-borda` não ser contado como `barra`.
const NOMES = [...TOKENS].sort((a, b) => b.length - a.length).join('|')
const CLASSE = new RegExp(
  `(?<![\\w-])((?:[\\w-]+:)*)(?:${UTILITARIOS})-(${NOMES})(?![\\w-])(?:\\/\\d+)?`,
  'g',
)
const VARIAVEL = new RegExp(`(?:[\\w-]+:)*[^\\s'"\`]*var\\(--(${NOMES})\\)`, 'g')
const HEX = /#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g

function arquivos(pasta) {
  return readdirSync(pasta).flatMap((nome) => {
    const caminho = join(pasta, nome)
    if (statSync(caminho).isDirectory())
      return caminho.endsWith(join('src', 'test')) ? [] : arquivos(caminho)
    if (!/\.(tsx?|css)$/.test(nome) || /\.test\./.test(nome)) return []
    return [caminho]
  })
}

const contagem = Object.fromEntries(
  TOKENS.map((token) => [token, { claro: 0, escuro: 0, arquivos: new Set() }]),
)
const hexFixos = []

for (const caminho of arquivos(PASTA)) {
  const relativo = relative(RAIZ, caminho).split(sep).join('/')
  const isCss = relativo.endsWith('.css')
  readFileSync(caminho, 'utf8')
    .split('\n')
    .forEach((linha, indice) => {
      const isDefinicao = isCss && /^\s*--[\w-]+\s*:/.test(linha)
      const somar = (token, prefixos) => {
        const isSoEscuro = /(^|:)dark:/.test(prefixos)
        contagem[token].escuro++
        if (!isSoEscuro) contagem[token].claro++
        contagem[token].arquivos.add(relativo)
      }
      if (!isDefinicao) {
        for (const [, prefixos, token] of linha.matchAll(CLASSE)) somar(token, prefixos)
        for (const [trecho, token] of linha.matchAll(VARIAVEL)) {
          // `var(--x)` dentro de uma classe que já foi contada acima (ex.: bg-[...var(--caneta)])
          // é outra referência ao mesmo token, então também conta.
          somar(token, trecho)
        }
      }
      if (!isDefinicao && !/^\s*(\/\/|\*|\/\*)/.test(linha))
        for (const [hex] of linha.matchAll(HEX))
          hexFixos.push({ arquivo: relativo, linha: indice + 1, hex: hex.toLowerCase() })
    })
}

const ranking = Object.entries(contagem)
  .map(([token, { claro, escuro, arquivos }]) => ({
    token,
    base: ALIAS[token] ?? token,
    claro,
    escuro,
    arquivos: arquivos.size,
  }))
  .sort((a, b) => b.claro - a.claro || b.escuro - a.escuro)

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ ranking, hexFixos }, null, 2))
} else {
  console.log(
    'token'.padEnd(22),
    'claro'.padStart(6),
    'escuro'.padStart(7),
    'arquivos'.padStart(9),
    '  cor-base',
  )
  for (const linha of ranking)
    console.log(
      linha.token.padEnd(22),
      String(linha.claro).padStart(6),
      String(linha.escuro).padStart(7),
      String(linha.arquivos).padStart(9),
      ' ',
      linha.base,
    )
  console.log(`\nHex fixos em src/ (fora de definições de token): ${hexFixos.length}`)
  for (const { arquivo, linha, hex } of hexFixos) console.log(`  ${arquivo}:${linha}  ${hex}`)
}
