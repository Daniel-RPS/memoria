/**
 * Detecta endereços de site num texto livre, só para exibição: o texto salvo nunca muda.
 * Só http e https viram link (javascript:, data: e afins ficam como texto).
 */

export type PedacoDeTexto =
  | { tipo: 'texto'; texto: string }
  | { tipo: 'link'; texto: string; href: string }

/** Domínios aceitos quando o endereço vem sem protocolo nem "www.". */
const FINAIS_SEM_PROTOCOLO = [
  'com.br',
  'gov.br',
  'com',
  'br',
  'org',
  'net',
  'io',
  'dev',
  'app',
  'tech',
  'me',
]

/** Candidato: tudo até espaço ou < > " ' (o fim exato é ajustado depois). */
const CANDIDATO = /(?:https?:\/\/|www\.)[^\s<>"']+|[a-z0-9][a-z0-9-]*(?:\.[a-z0-9-]+)+(?:\/[^\s<>"']*)?/giu

const PONTUACAO_FINAL = new Set(['.', ',', ';', ':', '!', '?', ')', ']', '}'])
const ABRE_DE: Record<string, string> = { ')': '(', ']': '[', '}': '{' }

/** Antes do link só pode vir início, espaço ou pontuação de abertura (bloqueia e-mail e "a_b.com"). */
const ANTES_PERMITIDO = /[\s([{<"'“‘:]/u

function contar(texto: string, caractere: string): number {
  let total = 0
  for (const letra of texto) if (letra === caractere) total++
  return total
}

/** Tira a pontuação final que não faz parte do endereço. */
function aparar(candidato: string): string {
  let fim = candidato.length
  while (fim > 0) {
    const ultimo = candidato[fim - 1]!
    if (!PONTUACAO_FINAL.has(ultimo)) break
    const abre = ABRE_DE[ultimo]
    if (abre) {
      const trecho = candidato.slice(0, fim)
      // ")" fica se houver "(" correspondente dentro do próprio link.
      if (contar(trecho, abre) >= contar(trecho, ultimo)) break
    }
    fim--
  }
  return candidato.slice(0, fim)
}

function hostDe(endereco: string): string {
  const semProtocolo = endereco.replace(/^https?:\/\//i, '')
  return semProtocolo.split(/[/?#]/u)[0]!.toLowerCase()
}

function hostValido(host: string): boolean {
  const semPorta = host.replace(/:\d+$/u, '')
  if (!semPorta.includes('.')) return semPorta === 'localhost'
  const partes = semPorta.split('.')
  return partes.every((parte) => /^[a-z0-9-]+$/iu.test(parte) && parte !== '') &&
    /[a-z]/iu.test(partes[partes.length - 1]!)
}

function terminaEmDominioAceito(host: string): boolean {
  return FINAIS_SEM_PROTOCOLO.some((final) => host.endsWith(`.${final}`))
}

/** Devolve o link (texto + href) se o candidato for um endereço válido. */
function interpretar(texto: string): { texto: string; href: string } | null {
  if (/^https?:\/\//iu.test(texto)) {
    const host = hostDe(texto)
    if (!host || !hostValido(host)) return null
    return { texto, href: texto }
  }
  const host = hostDe(texto)
  if (!hostValido(host)) return null
  if (/^www\./iu.test(texto)) return { texto, href: `https://${texto}` }
  if (!terminaEmDominioAceito(host)) return null
  return { texto, href: `https://${texto}` }
}

/** Quebra o texto em pedaços de texto comum e de link, preservando cada caractere. */
export function separarLinks(texto: string): PedacoDeTexto[] {
  const pedacos: PedacoDeTexto[] = []
  let cursor = 0

  const busca = new RegExp(CANDIDATO.source, CANDIDATO.flags)
  let encontro: RegExpExecArray | null
  while ((encontro = busca.exec(texto)) !== null) {
    const inicio = encontro.index
    const anterior = inicio > 0 ? texto[inicio - 1]! : ''
    if (anterior && !ANTES_PERMITIDO.test(anterior)) continue

    // Link em Markdown "[texto](endereço)": o primeiro termina antes de "](".
    let bruto = encontro[0]
    const markdown = bruto.indexOf('](')
    if (markdown >= 0) bruto = bruto.slice(0, markdown)

    const link = interpretar(aparar(bruto))
    if (!link) continue

    if (inicio > cursor) pedacos.push({ tipo: 'texto', texto: texto.slice(cursor, inicio) })
    pedacos.push({ tipo: 'link', ...link })
    cursor = inicio + link.texto.length
    busca.lastIndex = cursor
  }

  if (cursor < texto.length) pedacos.push({ tipo: 'texto', texto: texto.slice(cursor) })
  return pedacos
}

/** Só os links do texto (ex.: chips abaixo de um campo em edição). */
export function linksDoTexto(texto: string): { texto: string; href: string }[] {
  return separarLinks(texto).flatMap((pedaco) =>
    pedaco.tipo === 'link' ? [{ texto: pedaco.texto, href: pedaco.href }] : [],
  )
}

/** Links sem repetir endereço, na ordem em que aparecem. */
export function linksUnicos(texto: string): { texto: string; href: string }[] {
  const vistos = new Set<string>()
  return linksDoTexto(texto).filter((link) => {
    if (vistos.has(link.href)) return false
    vistos.add(link.href)
    return true
  })
}

const TAMANHO_MAXIMO_TRECHO = 24

/** Rótulo curto para chip: domínio sem "www." + último trecho do caminho ("github.com/…/x.yml"). */
export function rotuloCurtoDoLink(href: string): string {
  const semProtocolo = href.replace(/^https?:\/\//iu, '')
  const [host = '', ...resto] = semProtocolo.split('/')
  const dominio = host.replace(/^www\./iu, '')
  const partes = resto.join('/').split(/[?#]/u)[0]!.split('/').filter(Boolean)
  if (partes.length === 0) return dominio
  let ultimo = partes[partes.length - 1]!
  if (ultimo.length > TAMANHO_MAXIMO_TRECHO) ultimo = `${ultimo.slice(0, TAMANHO_MAXIMO_TRECHO)}…`
  return partes.length === 1 ? `${dominio}/${ultimo}` : `${dominio}/…/${ultimo}`
}
