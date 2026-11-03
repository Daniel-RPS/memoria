import { z } from 'zod'
import type { Icone } from '@/db/types'
import { normalizar } from '@/lib/procedimentos'

const semEspacos = (texto: string) => normalizar(texto).replace(/[^a-z0-9]/g, '')

/**
 * Regras dos ícones de procedimentos e categorias (emoji ou marca do Simple Icons), sem tela:
 * validação, o que mostrar para um slug que não existe mais, busca de marcas e recentes.
 */

/** Slug do Simple Icons: minúsculas e números ("github", "mercadopago"). */
const SLUG_DE_MARCA = /^[a-z0-9]+$/
/** Um emoji (com variações de pele, bandeiras e sequências ZWJ), sem letras ou números soltos. */
const TEM_EMOJI = /\p{Extended_Pictographic}|\p{Regional_Indicator}|\u20E3/u
const TAMANHO_MAXIMO_EMOJI = 32

export const esquemaIcone = z.discriminatedUnion('tipo', [
  z.object({
    tipo: z.literal('emoji'),
    valor: z
      .string()
      .min(1)
      .max(TAMANHO_MAXIMO_EMOJI)
      .refine((texto) => TEM_EMOJI.test(texto) && !/[\p{L}\s]/u.test(texto)),
  }),
  z.object({ tipo: z.literal('marca'), valor: z.string().max(64).regex(SLUG_DE_MARCA) }),
  z.object({
    tipo: z.literal('generico'),
    valor: z.string().refine((valor): valor is IconeGenerico => Object.hasOwn(GENERICOS, valor)),
  }),
])

/** Slug reservado ao símbolo do próprio app (não vem do Simple Icons). */
export const SLUG_DO_APP = 'memoria'
/** Entrada do símbolo do app na aba Marcas: o primeiro item, achado pela busca como as outras. */
export const MARCA_DO_APP: MarcaDoIndice = { t: 'MemorIA', s: SLUG_DO_APP, h: '8B3DFF' }

/** Ícones genéricos (lucide) oferecidos no lugar de marcas proibidas pelo Simple Icons. */
export const GENERICOS = {
  pacote: 'Pacote',
  nuvem: 'Nuvem',
  servidor: 'Servidor',
} as const
export type IconeGenerico = keyof typeof GENERICOS

/** Dica do ícone genérico sugerido na busca. */
export const DICA_DO_GENERICO = 'Ícone genérico (a marca não está disponível)'

/**
 * Marcas que o Simple Icons não tem porque o dono pediu a retirada (Amazon, AWS): a busca
 * por elas sugere só um ícone genérico. NUNCA desenhar ou imitar o logotipo.
 */
const MARCAS_INDISPONIVEIS: { nomes: string[]; genericos: IconeGenerico[] }[] = [
  { nomes: ['amazon', 'amazonprime', 'primevideo'], genericos: ['pacote'] },
  { nomes: ['aws', 'amazonwebservices'], genericos: ['nuvem', 'servidor'] },
]

/** Genéricos sugeridos para a busca (vazio se o termo não é uma marca indisponível). */
export function sugerirGenericos(termo: string): IconeGenerico[] {
  const busca = semEspacos(termo)
  if (busca.length < 3) return []
  // Nome exato manda ("amazon" não puxa os de "amazonwebservices"); senão, vale o começo.
  const exatos = MARCAS_INDISPONIVEIS.filter(({ nomes }) => nomes.includes(busca))
  const achados = (
    exatos.length > 0
      ? exatos
      : MARCAS_INDISPONIVEIS.filter(({ nomes }) =>
          nomes.some((nome) => nome.startsWith(busca) || busca.startsWith(nome)),
        )
  ).flatMap(({ genericos }) => genericos)
  return [...new Set(achados)]
}

/** Ícone válido ou `undefined` (o que vier quebrado de fora é ignorado, sem erro). */
export function iconeValido(valor: unknown): Icone | undefined {
  const lido = esquemaIcone.safeParse(valor)
  return lido.success ? lido.data : undefined
}

/** Entrada do índice leve das marcas (`/marcas/indice.json`). */
export interface MarcaDoIndice {
  /** Nome oficial ("GitHub"). */
  t: string
  /** Slug ("github"): nome do arquivo `/marcas/<slug>.svg`. */
  s: string
  /** Cor oficial, sem "#". */
  h: string
  /** Outros nomes ("Também conhecido como"). */
  a?: string[]
}

export type IconeResolvido =
  | { tipo: 'emoji'; emoji: string }
  | { tipo: 'marca'; slug: string; nome: string; cor: string }
  /** Símbolo do próprio MemorIA (imagem por tema, como o logo da barra). */
  | { tipo: 'app'; slug: string; nome: string }
  | { tipo: 'generico'; valor: IconeGenerico; nome: string }
  /** Índice ainda carregando: guarda o lugar, sem desenho. */
  | { tipo: 'carregando'; slug: string }
  /** Marca que saiu da biblioteca numa atualização: ícone neutro, sem quebrar. */
  | { tipo: 'neutro'; slug: string }

/** O que desenhar para o ícone guardado; `indice` = mapa slug → marca (`undefined` carregando). */
export function resolverIcone(
  icone: Icone,
  indice: ReadonlyMap<string, MarcaDoIndice> | undefined,
): IconeResolvido {
  if (icone.tipo === 'emoji') return { tipo: 'emoji', emoji: icone.valor }
  if (icone.tipo === 'generico') {
    const valor = icone.valor as IconeGenerico
    return Object.hasOwn(GENERICOS, valor)
      ? { tipo: 'generico', valor, nome: GENERICOS[valor] }
      : { tipo: 'neutro', slug: icone.valor }
  }
  if (icone.valor === SLUG_DO_APP) return { tipo: 'app', slug: SLUG_DO_APP, nome: MARCA_DO_APP.t }
  if (!indice) return { tipo: 'carregando', slug: icone.valor }
  const marca = indice.get(icone.valor)
  if (!marca) return { tipo: 'neutro', slug: icone.valor }
  return { tipo: 'marca', slug: marca.s, nome: marca.t, cor: `#${marca.h}` }
}

/** Nome do ícone para o leitor de tela e a dica ("GitHub"; o próprio emoji). */
export function nomeDoIcone(resolvido: IconeResolvido) {
  switch (resolvido.tipo) {
    case 'emoji':
      return resolvido.emoji
    case 'marca':
    case 'app':
    case 'generico':
      return resolvido.nome
    default:
      return resolvido.slug
  }
}

/** Mapa slug → marca, para achar uma marca sem percorrer a lista. */
export function indexarMarcas(marcas: MarcaDoIndice[]) {
  return new Map(marcas.map((marca) => [marca.s, marca]))
}

/**
 * Marcas cujo nome, slug ou apelido contém o termo (sem acento, maiúscula, espaço ou pontuação:
 * "mercado pago" acha "mercadopago"). Quem começa pelo termo vem primeiro; depois, por nome.
 */
export function buscarMarcas(marcas: MarcaDoIndice[], termo: string, limite = 120) {
  const busca = semEspacos(termo)
  if (!busca) return marcas.slice(0, limite)
  const pontuadas: { marca: MarcaDoIndice; pontos: number }[] = []
  for (const marca of marcas) {
    const nomes = [marca.t, marca.s, ...(marca.a ?? [])].map(semEspacos)
    if (nomes.some((nome) => nome === busca)) pontuadas.push({ marca, pontos: 0 })
    else if (nomes.some((nome) => nome.startsWith(busca))) pontuadas.push({ marca, pontos: 1 })
    else if (nomes.some((nome) => nome.includes(busca))) pontuadas.push({ marca, pontos: 2 })
  }
  return pontuadas
    .sort((a, b) => a.pontos - b.pontos || a.marca.t.localeCompare(b.marca.t, 'pt-BR'))
    .slice(0, limite)
    .map(({ marca }) => marca)
}

/** Quantos ícones "Usados recentemente" guarda (somando emojis e marcas). */
export const RECENTES_NO_MAXIMO = 24

/** Põe o ícone no começo dos recentes, sem repetir, até o máximo. */
export function adicionarAosRecentes(recentes: Icone[], icone: Icone) {
  return [
    icone,
    ...recentes.filter((outro) => outro.tipo !== icone.tipo || outro.valor !== icone.valor),
  ].slice(0, RECENTES_NO_MAXIMO)
}

/** Lê os recentes guardados (JSON); o que estiver quebrado é ignorado. */
export function lerRecentes(texto: string | null): Icone[] {
  if (!texto) return []
  try {
    const lido: unknown = JSON.parse(texto)
    if (!Array.isArray(lido)) return []
    return lido.map(iconeValido).filter((icone): icone is Icone => icone !== undefined)
  } catch {
    return []
  }
}

/**
 * Marcas mostradas na aba Marcas antes de digitar (as pedidas pelo usuário que existem no
 * Simple Icons; LinkedIn, Windows e Amazon/AWS são marcas proibidas pela biblioteca). O
 * símbolo do MemorIA vem antes delas (`MARCA_DO_APP`).
 */
export const MARCAS_SUGERIDAS = [
  'cloudflare',
  'github',
  'instagram',
  'whatsapp',
  'telegram',
  'hostinger',
  'laragon',
  'netlify',
  'meta',
  'x',
  'mercadopago',
  'claude',
  'anthropic',
  'google',
  'docker',
  'n8n',
] as const
