/**
 * Extensões aceitas para documentos anexados.
 * Comparação sempre em minúsculas e sem ponto.
 */
export const DOCUMENTO_EXTENSOES = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.dwg'] as const

export type DocumentoExtensao = (typeof DOCUMENTO_EXTENSOES)[number]

/** Limite de tamanho por arquivo em bytes (20 MB). */
export const DOCUMENTO_MAX_BYTES = 20 * 1024 * 1024

const BYTES_POR_MB = 1024 * 1024

/**
 * Formata tamanho em bytes para leitura humana ("1,3 MB", "500 KB", "20 MB").
 * Usa vírgula como separador decimal.
 */
export function formatarTamanhoBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) {
    const comUmaCasa = kb.toFixed(1)
    const formatado = comUmaCasa.endsWith('.0') ? Math.round(kb).toString() : comUmaCasa
    return `${formatado.replace('.', ',')} KB`
  }
  const mb = bytes / BYTES_POR_MB
  const comUmaCasa = mb.toFixed(1)
  const formatado = comUmaCasa.endsWith('.0') ? Math.round(mb).toString() : comUmaCasa
  return `${formatado.replace('.', ',')} MB`
}

/** Formatação do limite para mensagens ("20 MB"). */
export const DOCUMENTO_LIMITE_FORMATADO = formatarTamanhoBytes(DOCUMENTO_MAX_BYTES)

/** Rótulo dos formatos aceitos para mensagens ("PDF, Word, Excel ou DWG"). */
export const DOCUMENTO_FORMATOS_ROTULO = 'PDF, Word, Excel ou DWG'

/**
 * Remove caracteres proibidos em caminhos de arquivos (/ \ : * ? " < > |),
 * preservando o nome original sem caminhos maliciosos.
 */
export function tratarNomeArquivo(nome: string): string {
  return nome.replace(/[/\\:*?"<>|]/g, '_').trim()
}

/**
 * Extrai a última extensão de um nome de arquivo em minúsculas (com ponto, ex: ".pdf").
 * Se não tiver extensão, retorna vazio.
 */
export function extrairExtensao(nome: string): string {
  const partes = nome.split('.')
  if (partes.length <= 1) return ''
  const ext = partes.pop()
  if (!ext) return ''
  return `.${ext.toLowerCase()}`
}

export interface ValidacaoDocumentoResultado {
  isValido: boolean
  motivo?: string
  extensao?: string
}

/**
 * Valida um arquivo para anexo de documento.
 * Regras:
 * - Deve ter extensão
 * - Extensão deve estar em DOCUMENTO_EXTENSOES (case-insensitive)
 * - Não pode ter 0 bytes
 * - Não pode exceder DOCUMENTO_MAX_BYTES (20 MB exatos passa; 20 MB + 1 byte não passa)
 * - Nome com extensão dupla suspeita vale pela ÚLTIMA extensão (ex: relatorio.pdf.exe -> .exe -> recusado)
 */
export function validarArquivoDocumento(arquivo: { name: string; size: number }): ValidacaoDocumentoResultado {
  const ext = extrairExtensao(arquivo.name)

  if (!ext || !DOCUMENTO_EXTENSOES.includes(ext as DocumentoExtensao)) {
    return {
      isValido: false,
      motivo: `Formato não aceito. Use ${DOCUMENTO_FORMATOS_ROTULO}.`,
    }
  }

  if (arquivo.size === 0) {
    return {
      isValido: false,
      motivo: `O arquivo ${arquivo.name} está vazio.`,
    }
  }

  if (arquivo.size > DOCUMENTO_MAX_BYTES) {
    const tamanhoFormatado = formatarTamanhoBytes(arquivo.size)
    return {
      isValido: false,
      motivo: `${arquivo.name} tem ${tamanhoFormatado}. O limite é ${DOCUMENTO_LIMITE_FORMATADO}.`,
    }
  }

  return {
    isValido: true,
    extensao: ext,
  }
}

export type TipoDocumentoFamilia = 'pdf' | 'word' | 'excel' | 'dwg'

/**
 * Identifica a família do documento a partir da extensão para estilização e ícone.
 */
export function familiaDoDocumento(extensaoOuNome: string): TipoDocumentoFamilia {
  const ext = extensaoOuNome.startsWith('.') ? extensaoOuNome.toLowerCase() : extrairExtensao(extensaoOuNome)
  if (ext === '.pdf') return 'pdf'
  if (ext === '.doc' || ext === '.docx') return 'word'
  if (ext === '.xls' || ext === '.xlsx') return 'excel'
  if (ext === '.dwg') return 'dwg'
  return 'pdf'
}

/**
 * Sigla para o badge compacto (PDF, DOC, XLS, DWG).
 */
export function siglaDoDocumento(extensaoOuNome: string): string {
  const familia = familiaDoDocumento(extensaoOuNome)
  switch (familia) {
    case 'pdf':
      return 'PDF'
    case 'word':
      return 'DOC'
    case 'excel':
      return 'XLS'
    case 'dwg':
      return 'DWG'
  }
}

/**
 * MimeType padrão para o Blob caso o navegador não informe ou venha vazio.
 */
export function mimeTypePadrao(extensao: string): string {
  switch (extensao.toLowerCase()) {
    case '.pdf':
      return 'application/pdf'
    case '.doc':
      return 'application/msword'
    case '.docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    case '.xls':
      return 'application/vnd.ms-excel'
    case '.xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    case '.dwg':
      return 'image/vnd.dwg'
    default:
      return 'application/octet-stream'
  }
}
