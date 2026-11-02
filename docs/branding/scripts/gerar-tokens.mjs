#!/usr/bin/env node
/**
 * Lê os tokens de cor de `src/index.css` (`:root` e `:root[data-tema='escuro']`), resolve
 * `var(--x)` e `color-mix(in oklab, ...)` como o navegador faz, calcula rgb/hsl e o contraste
 * WCAG dos pares principais e grava `docs/branding/tokens.json`. Nada é digitado à mão aqui:
 * os valores vêm do CSS; o script só acrescenta a descrição de cada token.
 *
 * Uso (na raiz do projeto): node docs/branding/scripts/gerar-tokens.mjs
 * Com `--tabela`, também imprime as tabelas em Markdown usadas no cores.md.
 */
import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

const css = readFileSync('src/index.css', 'utf8')

function bloco(seletor) {
  const inicio = css.indexOf(`${seletor} {`)
  const fim = css.indexOf('\n}', inicio)
  const definicoes = {}
  for (const [, nome, valor] of css.slice(inicio, fim).matchAll(/--([\w-]+):\s*([^;]+);/g))
    definicoes[nome] = valor.trim().replace(/\s+/g, ' ')
  return definicoes
}

const claro = bloco(':root')
const escuro = { ...claro, ...bloco(":root[data-tema='escuro']") }

// ---------- cor: hex <-> rgb <-> oklab ----------
const paraLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const deLinear = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055)

function lerHex(hex) {
  const h = hex.replace('#', '')
  const cheio = h.length === 3 ? [...h].map((c) => c + c).join('') : h
  return [0, 2, 4].map((i) => parseInt(cheio.slice(i, i + 2), 16))
}
const hexDe = (rgb) => '#' + rgb.map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')

function rgbParaOklab([r, g, b]) {
  const [lr, lg, lb] = [r, g, b].map((c) => paraLinear(c / 255))
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb)
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb)
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb)
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ]
}
function oklabParaRgb([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map((c) => Math.min(255, Math.max(0, deLinear(c) * 255)))
}

/** Cor resolvida: { rgb: [r,g,b], alfa } */
function resolver(valor, tema) {
  valor = valor.trim()
  const variavel = valor.match(/^var\(--([\w-]+)\)$/)
  if (variavel) return resolver(tema[variavel[1]], tema)
  if (valor.startsWith('#')) return { rgb: lerHex(valor), alfa: 1 }
  const rgba = valor.match(/^rgb\((\d+) (\d+) (\d+) \/ ([\d.]+)\)$/)
  if (rgba) return { rgb: rgba.slice(1, 4).map(Number), alfa: Number(rgba[4]) }
  const mistura = valor.match(/^color-mix\(in oklab, (.+?) ([\d.]+)%, (.+)\)$/)
  if (mistura) {
    const a = resolver(mistura[1], tema)
    const p = Number(mistura[2]) / 100
    if (mistura[3] === 'transparent') return { rgb: a.rgb, alfa: p }
    const b = resolver(mistura[3], tema)
    const [la, lb] = [rgbParaOklab(a.rgb), rgbParaOklab(b.rgb)]
    return { rgb: oklabParaRgb(la.map((c, i) => c * p + lb[i] * (1 - p))), alfa: 1 }
  }
  return null
}

function hsl([r, g, b]) {
  const [rr, gg, bb] = [r, g, b].map((c) => c / 255)
  const maior = Math.max(rr, gg, bb)
  const menor = Math.min(rr, gg, bb)
  const l = (maior + menor) / 2
  const d = maior - menor
  let h = 0
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1))
  if (d) {
    if (maior === rr) h = ((gg - bb) / d) % 6
    else if (maior === gg) h = (bb - rr) / d + 2
    else h = (rr - gg) / d + 4
  }
  return `hsl(${Math.round((h * 60 + 360) % 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%)`
}

function descrever(cor) {
  const rgb = cor.rgb.map(Math.round)
  const base = { hex: hexDe(rgb), rgb: `rgb(${rgb.join(' ')})`, hsl: hsl(rgb) }
  return cor.alfa < 1
    ? {
        ...base,
        alfa: cor.alfa,
        css: `${base.hex}${Math.round(cor.alfa * 255)
          .toString(16)
          .padStart(2, '0')}`,
      }
    : base
}

function luminancia(rgb) {
  const [r, g, b] = rgb.map((c) => paraLinear(c / 255))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
function contraste(a, b) {
  const [x, y] = [luminancia(a), luminancia(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}

// ---------- descrição de cada token ----------
const PAPEIS = {
  nevoa: 'Fundo da página (o <html>), atrás das folhas e da barra lateral.',
  papel: 'Superfície das folhas, fichas/cards, popovers e campos.',
  tinta: 'Texto principal e ícones fortes; fundo do botão "Criar" da captura.',
  grafite: 'Texto secundário (datas, contadores, rótulos, ícones discretos).',
  pauta: 'Linhas e bordas: pauta da folha, borda de card, divisórias.',
  caneta: 'Cor da marca: ação principal, item ativo, foco, ✓ dos menus, links.',
  'violeta-profundo':
    'Destaques miúdos: texto sobre marca-texto, "hoje", item ativo do Calendário, nível 4 do mapa.',
  'marca-texto':
    'Fundo lavanda só para atrasos ("há X dias", "pendente desde") e a sombra dos menus.',
  alerta: 'Laranja só no título e no contador de Atrasadas do Início.',
  background: 'Alias shadcn de nevoa (fundo da página).',
  foreground: 'Alias shadcn de tinta (texto).',
  card: 'Alias shadcn de papel.',
  'card-foreground': 'Alias shadcn de tinta (sem uso no código).',
  popover: 'Fundo de menus e popovers (papel no claro; um pouco mais claro que o papel no escuro).',
  'popover-foreground': 'Texto de menus e popovers.',
  primary: 'Alias shadcn de caneta (botão principal).',
  'primary-foreground': 'Texto sobre a caneta (branco no claro, quase preto no escuro).',
  secondary: 'Fundo de botão secundário.',
  'secondary-foreground': 'Texto do botão secundário.',
  muted: 'Fundo apagado (skeleton, áreas neutras).',
  'muted-foreground': 'Alias shadcn de grafite.',
  accent: 'Hover e item realçado em menus e listas (lavanda bem clara).',
  'accent-foreground': 'Texto sobre accent.',
  destructive: 'Erro e ações de excluir.',
  border: 'Alias shadcn de pauta (borda padrão de tudo).',
  input: 'Borda dos campos de formulário.',
  ring: 'Anel de foco (caneta, usado com 50% de opacidade).',
  barra: 'Fundo da barra lateral.',
  'barra-borda': 'Borda da barra lateral (= pauta).',
  'barra-texto': 'Texto da barra lateral (= tinta).',
  'barra-suave': 'Texto secundário da barra lateral (= grafite).',
  'barra-realce': 'Hover/item ativo da barra lateral (tinta a 6%).',
  'fundo-mancha-1': 'Fundo Aurora: mancha violeta (canto superior direito).',
  'fundo-mancha-2': 'Fundo Aurora: mancha azul (#4f7dff) embaixo à esquerda.',
  'fundo-mancha-3': 'Fundo Aurora: mancha magenta (#d36bff) no centro.',
  'fundo-ponto': 'Fundo Pontos: cor dos pontos da grade (22 px).',
  'fundo-linha': 'Fundo Grade: linhas da grade (32 px).',
  'fundo-brilho': 'Fundo Pontos: brilho violeta no canto.',
  'fundo-holofote': 'Fundo Grade: holofote que segue o ponteiro (380 px).',
}
const GRUPOS = {
  marca: [
    'nevoa',
    'papel',
    'tinta',
    'grafite',
    'pauta',
    'caneta',
    'violeta-profundo',
    'marca-texto',
    'alerta',
  ],
  shadcn: [
    'background',
    'foreground',
    'card',
    'card-foreground',
    'popover',
    'popover-foreground',
    'primary',
    'primary-foreground',
    'secondary',
    'secondary-foreground',
    'muted',
    'muted-foreground',
    'accent',
    'accent-foreground',
    'destructive',
    'border',
    'input',
    'ring',
  ],
  barraLateral: ['barra', 'barra-borda', 'barra-texto', 'barra-suave', 'barra-realce'],
  fundo: [
    'fundo-mancha-1',
    'fundo-mancha-2',
    'fundo-mancha-3',
    'fundo-ponto',
    'fundo-linha',
    'fundo-brilho',
    'fundo-holofote',
  ],
}

const cores = {}
for (const [grupo, nomes] of Object.entries(GRUPOS)) {
  cores[grupo] = {}
  for (const nome of nomes)
    cores[grupo][nome] = {
      papel: PAPEIS[nome],
      cssVar: `--${nome}`,
      tailwind: `*-${nome}`,
      definicao: { claro: claro[nome], escuro: escuro[nome] },
      claro: descrever(resolver(claro[nome], claro)),
      escuro: descrever(resolver(escuro[nome], escuro)),
    }
}

// Mapa de conclusões (src/features/inicio/components/cores-dos-niveis.ts)
const mapa = (tema) => [
  { nivel: 0, classe: 'bg-nevoa + contorno pauta', ...descrever(resolver('var(--nevoa)', tema)) },
  {
    nivel: 1,
    classe: 'color-mix(caneta 24%, papel)',
    ...descrever(resolver('color-mix(in oklab, var(--caneta) 24%, var(--papel))', tema)),
  },
  {
    nivel: 2,
    classe: 'color-mix(caneta 52%, papel)',
    ...descrever(resolver('color-mix(in oklab, var(--caneta) 52%, var(--papel))', tema)),
  },
  { nivel: 3, classe: 'bg-caneta', ...descrever(resolver('var(--caneta)', tema)) },
  {
    nivel: 4,
    classe: 'bg-violeta-profundo',
    ...descrever(resolver('var(--violeta-profundo)', tema)),
  },
]
// Visão de Ano (src/features/ano/tons.ts): caneta/15, /40 e cheia, sobre o papel. A opacidade
// do Tailwind deixa a caneta translúcida; o navegador compõe com o papel em sRGB.
const sobrePapel = (porcento, tema) => {
  const [caneta, papel] = [resolver('var(--caneta)', tema), resolver('var(--papel)', tema)]
  const p = porcento / 100
  return descrever({ rgb: caneta.rgb.map((c, i) => c * p + papel.rgb[i] * (1 - p)), alfa: 1 })
}
const ano = (tema) => [
  { faixa: 0, classe: '(sem fundo)', ...descrever(resolver('var(--papel)', tema)) },
  { faixa: 1, classe: 'bg-caneta/15', ...sobrePapel(15, tema) },
  { faixa: 2, classe: 'bg-caneta/40', ...sobrePapel(40, tema) },
  { faixa: 3, classe: 'bg-caneta text-white', ...descrever(resolver('var(--caneta)', tema)) },
]

const PALETA = [
  ...readFileSync('src/lib/cores.ts', 'utf8').matchAll(
    /\{ nome: '([^']+)', hex: '(#[0-9a-f]{6})' \}/g,
  ),
].map(([, nome, hex]) => {
  const escuroRgb = lerHex(hex).map((c) => Math.round(c + (255 - c) * 0.28))
  return { nome, hex, escuroNaTela: hexDe(escuroRgb) }
})

// Pares de contraste: [rótulo, texto, fundo, tipo]
const PARES = [
  ['Texto principal sobre o fundo da página', 'var(--tinta)', 'var(--nevoa)', 'texto'],
  ['Texto principal sobre a folha/card', 'var(--tinta)', 'var(--papel)', 'texto'],
  ['Texto secundário sobre a folha/card', 'var(--grafite)', 'var(--papel)', 'texto'],
  ['Texto secundário sobre o fundo da página', 'var(--grafite)', 'var(--nevoa)', 'texto'],
  ['Texto secundário sobre muted', 'var(--grafite)', 'var(--muted)', 'texto'],
  ['Caneta (link/ativo) sobre a folha', 'var(--caneta)', 'var(--papel)', 'texto'],
  [
    'Texto do botão principal sobre a caneta',
    'var(--primary-foreground)',
    'var(--caneta)',
    'texto',
  ],
  ['Violeta profundo sobre a folha', 'var(--violeta-profundo)', 'var(--papel)', 'texto'],
  [
    'Violeta profundo sobre marca-texto (selo de atraso)',
    'var(--violeta-profundo)',
    'var(--marca-texto)',
    'texto',
  ],
  ['Alerta (Atrasadas) sobre a folha', 'var(--alerta)', 'var(--papel)', 'texto'],
  ['Alerta (Atrasadas) sobre o fundo da página', 'var(--alerta)', 'var(--nevoa)', 'texto'],
  ['Erro (destructive) sobre a folha', 'var(--destructive)', 'var(--papel)', 'texto'],
  ['Texto de menu sobre popover', 'var(--tinta)', 'var(--popover)', 'texto'],
  ['Texto sobre accent (hover de menu)', 'var(--tinta)', 'var(--accent)', 'texto'],
  ['Texto da barra lateral', 'var(--barra-texto)', 'var(--barra)', 'texto'],
  ['Texto secundário da barra lateral', 'var(--barra-suave)', 'var(--barra)', 'texto'],
  ['Papel sobre tinta (botão "Criar" da captura)', 'var(--papel)', 'var(--tinta)', 'texto'],
  ['Branco sobre caneta (faixa cheia da visão de Ano)', '#ffffff', 'var(--caneta)', 'texto'],
  ['Borda de campo (input) sobre a folha', 'var(--input)', 'var(--papel)', 'grafico'],
  ['Pauta (borda/linha) sobre a folha', 'var(--pauta)', 'var(--papel)', 'decorativo'],
]
function veredito(razao, tipo) {
  if (tipo === 'decorativo') return razao >= 3 ? 'passa 3:1' : 'decorativo (sem exigência)'
  if (tipo === 'grafico') return razao >= 3 ? 'AA (gráfico ≥ 3:1)' : 'abaixo de 3:1'
  if (razao >= 7) return 'AAA'
  if (razao >= 4.5) return 'AA'
  if (razao >= 3) return 'só texto grande (AA ≥ 3:1)'
  return 'reprova'
}
const contrastes = PARES.map(([rotulo, texto, fundo, tipo]) => {
  const porTema = {}
  for (const [nome, tema] of [
    ['claro', claro],
    ['escuro', escuro],
  ]) {
    const [t, f] = [resolver(texto, tema), resolver(fundo, tema)]
    const razao = contraste(t.rgb, f.rgb)
    porTema[nome] = {
      texto: hexDe(t.rgb.map(Math.round)),
      fundo: hexDe(f.rgb.map(Math.round)),
      razao: Math.round(razao * 10) / 10,
      resultado: veredito(razao, tipo),
    }
  }
  return { par: rotulo, texto, fundo, tipo, ...porTema }
})

// Logo: cores amostradas dos PNGs (src/assets/) com Pillow; ver cores.md.
const tokens = {
  $schema:
    'Tokens de marca do MemorIA, gerados por docs/branding/scripts/gerar-tokens.mjs a partir de src/index.css',
  nome: 'MemorIA',
  gerado: new Date().toISOString().slice(0, 10),
  temas: { claro: ":root (data-tema='claro')", escuro: ":root[data-tema='escuro']" },
  cores,
  maisUsadas: {
    metodo:
      'Referências no código (docs/branding/scripts/contar-cores.mjs), somando cada alias à cor-base; ver README.md',
    porCodigo: { grafite: 194, caneta: 151, tinta: 119 },
    porAreaVisivel: {
      metodo:
        'Pixels das capturas do Início e da Semana (1680×1000, fundo liso), cada um no token mais próximo; ver scripts/medir-area.py',
      claro: { nevoa: '53,9%', papel: '30,4%', barra: '12,5%' },
      escuro: { nevoa: '52,6%', papel: '30,4%', barra: '12,3%' },
    },
  },
  logo: {
    memorClaro: '#1a1625',
    memorEscuro: '#fcfdff',
    IA: 'gradiente violeta ≈ #8b3dff (amostras de #7a22ff a #9a50ff)',
    simbolo: 'violetas ≈ #8b3dff e lavandas claras; folha branca',
    fichaDoFavicon: '#111019 (tinta)',
  },
  mapaDeConclusoes: { claro: mapa(claro), escuro: mapa(escuro) },
  visaoDeAno: { claro: ano(claro), escuro: ano(escuro) },
  categorias: {
    observacao:
      'Escolha do usuário, não são cores da marca. No tema escuro a tela mostra a cor clareada 28% (corNaTela); faixas e barras ainda escurecem/clareiam até 3:1 sobre o papel (corDeTraco). O banco guarda a cor escolhida.',
    paleta: PALETA,
  },
  contrastes,
  tipografia: {
    sans: {
      familia: 'Bricolage Grotesque Variable',
      pilha: "'Bricolage Grotesque Variable', ui-sans-serif, system-ui, sans-serif",
      origem:
        'pacote npm @fontsource-variable/bricolage-grotesque (arquivo local, sem Google Fonts em tempo de execução)',
      licenca: 'SIL Open Font License 1.1',
      eixos: { peso: '200–800', largura: '75%–100%' },
      usos: ['interface', 'títulos (--font-heading = --font-sans)'],
    },
    mono: {
      familia: 'fonte monoespaçada do sistema (padrão do Tailwind)',
      pilha:
        'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
      usos: ['campo hexadecimal do misturador de cor'],
    },
    pesos: { normal: 400, medium: 500, semibold: 600, bold: 700, extrabold: 800 },
    escala: {
      'text-xs': { tamanho: '12px', altura: '16px' },
      'text-sm': { tamanho: '14px', altura: '20px' },
      'text-base': { tamanho: '16px', altura: '24px' },
      'text-lg': { tamanho: '18px', altura: '28px' },
      'text-xl': { tamanho: '20px', altura: '28px' },
      'text-2xl': { tamanho: '24px', altura: '32px' },
      'text-3xl': { tamanho: '30px', altura: '36px' },
      'text-4xl': { tamanho: '36px', altura: '40px' },
    },
  },
  raio: { base: claro.radius, sm: '0.6×', md: '0.8×', lg: '1×', xl: '1.4×' },
}

writeFileSync('docs/branding/tokens.json', JSON.stringify(tokens, null, 2) + '\n')
console.log('docs/branding/tokens.json gravado.')

// A paleta.html leva os mesmos tokens embutidos (abre por file://, sem fetch).
const PALETA_HTML = 'docs/branding/paleta.html'
const html = readFileSync(PALETA_HTML, 'utf8')
const embutido = html.replace(
  /(<script id="tokens" type="application\/json">)[\s\S]*?(<\/script>)/,
  (_, abre, fecha) => `${abre}${JSON.stringify(tokens)}${fecha}`,
)
writeFileSync(PALETA_HTML, embutido)
// Mesmo estilo do resto do repositório (sem ruído no diff ao regenerar).
execSync(`npx prettier --write docs/branding/tokens.json ${PALETA_HTML}`, { stdio: 'ignore' })
console.log(`${PALETA_HTML} atualizada.`)

if (process.argv.includes('--tabela')) {
  const fmt = (c) => (c.alfa ? `${c.hex} a ${Math.round(c.alfa * 100)}%` : `${c.hex}`)
  for (const [grupo, nomes] of Object.entries(cores)) {
    console.log(`\n### ${grupo}\n`)
    for (const [nome, t] of Object.entries(nomes))
      console.log(
        `| \`--${nome}\` | ${fmt(t.claro)} · ${t.claro.rgb} · ${t.claro.hsl} | ${fmt(t.escuro)} · ${t.escuro.rgb} · ${t.escuro.hsl} |`,
      )
  }
  console.log('\n### contrastes\n')
  for (const c of contrastes)
    console.log(
      `| ${c.par} | ${c.claro.razao}:1 ${c.claro.resultado} | ${c.escuro.razao}:1 ${c.escuro.resultado} |`,
    )
  console.log('\n### mapa\n')
  for (const t of ['claro', 'escuro'])
    console.log(
      t,
      mapa(t === 'claro' ? claro : escuro)
        .map((n) => n.hex)
        .join(' '),
    )
  console.log('\n### ano\n')
  for (const t of ['claro', 'escuro'])
    console.log(
      t,
      ano(t === 'claro' ? claro : escuro)
        .map((n) => n.hex)
        .join(' '),
    )
  console.log('\n### paleta\n')
  for (const p of PALETA) console.log(`| ${p.nome} | ${p.hex} | ${p.escuroNaTela} |`)
}
