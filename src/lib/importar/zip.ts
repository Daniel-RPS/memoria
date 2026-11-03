/**
 * Leitor mínimo de .zip, só para o Google Takeout: lê o diretório central e descompacta cada
 * arquivo com o `DecompressionStream('deflate-raw')` do próprio navegador (sem biblioteca).
 * Aceita arquivos guardados (método 0) e comprimidos (método 8); ZIP64 e criptografia não.
 */

const ASSINATURA_FIM = 0x06054b50
const ASSINATURA_CENTRAL = 0x02014b50
const ASSINATURA_LOCAL = 0x04034b50
const TAMANHO_FIM = 22
/** O comentário do .zip tem no máximo 65535 bytes: o fim do diretório está nesse trecho. */
const BUSCA_DO_FIM = TAMANHO_FIM + 0xffff
const SEM_COMPRESSAO = 0
const DEFLATE = 8
const VALOR_ZIP64 = 0xffffffff

export interface ArquivoDoZip {
  nome: string
  /** Lê o conteúdo descompactado. */
  ler: () => Promise<Uint8Array>
}

export class ErroDeZip extends Error {}

function acharFim(dados: DataView) {
  const inicio = Math.max(0, dados.byteLength - BUSCA_DO_FIM)
  for (let posicao = dados.byteLength - TAMANHO_FIM; posicao >= inicio; posicao--) {
    if (dados.getUint32(posicao, true) === ASSINATURA_FIM) return posicao
  }
  throw new ErroDeZip('O arquivo não é um .zip válido.')
}

async function descompactar(comprimido: Uint8Array) {
  const fluxo = new Blob([comprimido as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream('deflate-raw'))
  return new Uint8Array(await new Response(fluxo).arrayBuffer())
}

/** Lista os arquivos do .zip (pastas ficam de fora); o conteúdo é lido sob demanda. */
export function lerZip(conteudo: ArrayBuffer): ArquivoDoZip[] {
  const dados = new DataView(conteudo)
  const bytes = new Uint8Array(conteudo)
  const fim = acharFim(dados)
  const quantidade = dados.getUint16(fim + 10, true)
  let posicao = dados.getUint32(fim + 16, true)
  if (posicao === VALOR_ZIP64) throw new ErroDeZip('Arquivo .zip grande demais (ZIP64).')
  const decodificador = new TextDecoder()
  const arquivos: ArquivoDoZip[] = []

  for (let indice = 0; indice < quantidade; indice++) {
    if (dados.getUint32(posicao, true) !== ASSINATURA_CENTRAL) {
      throw new ErroDeZip('O .zip está corrompido.')
    }
    const bandeiras = dados.getUint16(posicao + 8, true)
    const metodo = dados.getUint16(posicao + 10, true)
    const tamanhoComprimido = dados.getUint32(posicao + 20, true)
    const tamanhoNome = dados.getUint16(posicao + 28, true)
    const tamanhoExtra = dados.getUint16(posicao + 30, true)
    const tamanhoComentario = dados.getUint16(posicao + 32, true)
    const local = dados.getUint32(posicao + 42, true)
    const nome = decodificador.decode(bytes.subarray(posicao + 46, posicao + 46 + tamanhoNome))
    posicao += 46 + tamanhoNome + tamanhoExtra + tamanhoComentario

    const isCriptografado = (bandeiras & 1) === 1
    if (nome.endsWith('/') || isCriptografado) continue
    if (dados.getUint32(local, true) !== ASSINATURA_LOCAL) {
      throw new ErroDeZip('O .zip está corrompido.')
    }
    const inicioDados =
      local + 30 + dados.getUint16(local + 26, true) + dados.getUint16(local + 28, true)
    const comprimido = bytes.subarray(inicioDados, inicioDados + tamanhoComprimido)
    if (metodo !== SEM_COMPRESSAO && metodo !== DEFLATE) continue
    arquivos.push({
      nome,
      ler: () =>
        metodo === SEM_COMPRESSAO ? Promise.resolve(comprimido.slice()) : descompactar(comprimido),
    })
  }
  return arquivos
}
