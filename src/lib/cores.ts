import type { Tema } from '@/lib/aparencia'

/** Cores disponíveis para categorias; escolhidas para ler bem sobre o papel claro. */
export const PALETA_CATEGORIAS = [
  { nome: 'Tomate', hex: '#c8402f' },
  { nome: 'Laranja', hex: '#d0702a' },
  { nome: 'Mostarda', hex: '#b88d14' },
  { nome: 'Oliva', hex: '#71842a' },
  { nome: 'Verde', hex: '#2f8a57' },
  { nome: 'Petróleo', hex: '#1f7a80' },
  { nome: 'Azul', hex: '#3366c2' },
  { nome: 'Índigo', hex: '#5b4fbf' },
  { nome: 'Ameixa', hex: '#8e4a9e' },
  { nome: 'Rosa', hex: '#c2477a' },
  { nome: 'Terra', hex: '#8a5a3c' },
  { nome: 'Grafite', hex: '#5e6b7a' },
] as const

/** Primeira cor da paleta ainda não usada; se todas estiverem em uso, recomeça. */
export function proximaCor(categoriasExistentes: { cor: string }[]) {
  const usadas = new Set(categoriasExistentes.map((categoria) => categoria.cor))
  const livre = PALETA_CATEGORIAS.find((cor) => !usadas.has(cor.hex))
  return (livre ?? PALETA_CATEGORIAS[categoriasExistentes.length % PALETA_CATEGORIAS.length]).hex
}

/** Nome da cor da paleta (ex.: "Azul") ou "personalizada". */
export function nomeDaCor(hex: string) {
  return PALETA_CATEGORIAS.find((cor) => cor.hex === hex)?.nome ?? 'personalizada'
}

export const COR_PADRAO_CATEGORIA = PALETA_CATEGORIAS[6].hex

const PADRAO_HEX = /^#[0-9a-f]{6}$/i

export function isCorValida(cor: string) {
  return PADRAO_HEX.test(cor)
}

/**
 * Passos alternando entre mais claro (mistura com branco) e mais escuro (mistura com preto),
 * para subcategorias vizinhas ficarem distinguíveis entre si e da categoria.
 */
const PASSOS_VARIACAO = [
  { alvo: 255, quanto: 0.3 },
  { alvo: 0, quanto: 0.22 },
  { alvo: 255, quanto: 0.5 },
  { alvo: 0, quanto: 0.38 },
] as const

function misturar(canal: number, alvo: number, quanto: number) {
  return Math.round(canal + (alvo - canal) * quanto)
}

/** Variação da cor da categoria para a subcategoria de posição `indice` (0, 1, 2...). */
export function variacaoCor(hex: string, indice: number) {
  const passo = PASSOS_VARIACAO[indice % PASSOS_VARIACAO.length]
  const canais = [1, 3, 5].map((inicio) => parseInt(hex.slice(inicio, inicio + 2), 16))
  return (
    '#' +
    canais
      .map((canal) => misturar(canal, passo.alvo, passo.quanto).toString(16).padStart(2, '0'))
      .join('')
  )
}

/** Quanto a cor da categoria clareia no tema escuro (as da paleta foram feitas para o claro). */
const CLAREAR_NO_ESCURO = 0.28

/**
 * Cor da categoria como aparece na tela: no escuro, clareada para destacar do papel escuro;
 * no claro, a própria. Só exibição: o banco guarda sempre a cor escolhida.
 */
export function corNaTela(hex: string, tema: Tema) {
  if (tema === 'claro' || !isCorValida(hex)) return hex
  return (
    '#' +
    [1, 3, 5]
      .map((inicio) => parseInt(hex.slice(inicio, inicio + 2), 16))
      .map((canal) => misturar(canal, 255, CLAREAR_NO_ESCURO).toString(16).padStart(2, '0'))
      .join('')
  )
}

/** Papel de cada tema (mesmos valores de `--papel` em `src/index.css`). */
const PAPEL_DO_TEMA: Record<Tema, string> = { claro: '#ffffff', escuro: '#19161f' }

/** Contraste mínimo de elemento gráfico (faixa, barra) sobre o papel, pela WCAG. */
const CONTRASTE_DE_TRACO = 3

function canais(hex: string) {
  return [1, 3, 5].map((inicio) => parseInt(hex.slice(inicio, inicio + 2), 16))
}

function luminancia(hex: string) {
  const [r = 0, g = 0, b = 0] = canais(hex).map((canal) => {
    const linear = canal / 255
    return linear <= 0.03928 ? linear / 12.92 : ((linear + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contraste(a: string, b: string) {
  const [clara, escura] = [luminancia(a), luminancia(b)].sort((x, y) => y - x)
  return ((clara ?? 0) + 0.05) / ((escura ?? 0) + 0.05)
}

/**
 * Cor de categoria para faixa e barra de progresso: a da tela (`corNaTela`) e, se ela some no
 * papel (ex.: amarelo claro no tema claro), escurecida (ou clareada, no escuro) aos poucos até
 * chegar a 3:1. Só exibição.
 */
export function corDeTraco(hex: string, tema: Tema) {
  const base = corNaTela(hex, tema)
  if (!isCorValida(base)) return base
  const papel = PAPEL_DO_TEMA[tema]
  const alvo = tema === 'claro' ? 0 : 255
  let cor = base
  for (let quanto = 0.1; contraste(cor, papel) < CONTRASTE_DE_TRACO && quanto <= 1; quanto += 0.1) {
    cor =
      '#' +
      canais(base)
        .map((canal) => misturar(canal, alvo, quanto).toString(16).padStart(2, '0'))
        .join('')
  }
  return cor
}
