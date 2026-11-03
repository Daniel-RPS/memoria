import { z } from 'zod'
import { esquemaLink, nomeDoLink } from '@/lib/anexos'
import {
  juntarRascunhos,
  rascunhoVazio,
  type AnexoImportado,
  type RascunhoDeImportacao,
} from '@/lib/importar/rascunho'
import type { ArquivoDoZip } from '@/lib/importar/zip'

/**
 * Google Keep pelo Google Takeout (um .json por nota, soltos ou dentro do .zip):
 * - nota de texto → nota (data da última edição preservada; imagens e links viram anexos);
 * - lista → grupo com os itens (marcados = concluídos) e o 1º rótulo como categoria sugerida;
 * - nota na lixeira fica de fora; áudio do Keep (.3gp) não toca no navegador e fica de fora.
 * Nota não tem categoria própria no MemorIA: o rótulo de uma nota de texto não é usado.
 */

const MICROSSEGUNDOS_POR_MILISSEGUNDO = 1000
/** Formatos de áudio que o navegador toca (o Keep grava em 3GP, que não toca). */
const AUDIO_QUE_TOCA = [
  'audio/mpeg',
  'audio/mp4',
  'audio/aac',
  'audio/ogg',
  'audio/webm',
  'audio/wav',
  'audio/x-m4a',
]

const esquemaNotaDoKeep = z.object({
  title: z.string().optional().default(''),
  textContent: z.string().optional(),
  listContent: z
    .array(z.object({ text: z.string(), isChecked: z.boolean().optional() }))
    .optional(),
  labels: z.array(z.object({ name: z.string() })).optional(),
  isTrashed: z.boolean().optional(),
  userEditedTimestampUsec: z.number().optional(),
  attachments: z.array(z.object({ filePath: z.string(), mimetype: z.string() })).optional(),
  annotations: z
    .array(z.object({ url: z.string().optional(), title: z.string().optional() }))
    .optional(),
})

/** Nome do arquivo sem a pasta ("Takeout/Keep/foto.jpg" → "foto.jpg"). */
export function nomeSemPasta(caminho: string) {
  return caminho.split(/[\\/]/).pop() ?? caminho
}

/**
 * Uma nota do Keep (JSON já lido) → rascunho. `anexos` = arquivos do Takeout pelo nome (sem
 * pasta); `nomeArquivo` aparece nos avisos.
 */
export function lerNotaDoKeep(
  json: unknown,
  nomeArquivo: string,
  anexos: ReadonlyMap<string, Blob> = new Map(),
  origem = 'keep',
): RascunhoDeImportacao {
  const rascunho = rascunhoVazio()
  const lido = esquemaNotaDoKeep.safeParse(json)
  if (!lido.success) {
    rascunho.avisos.push(`${nomeArquivo}: não parece uma nota do Google Keep.`)
    return rascunho
  }
  const nota = lido.data
  const titulo = nota.title.trim()
  if (nota.isTrashed) {
    rascunho.ignorados.push(`${titulo || nomeArquivo}: estava na lixeira do Keep.`)
    return rascunho
  }
  const rotulo = nota.labels?.[0]?.name

  if (nota.listContent) {
    const itens = nota.listContent
      .filter((item) => item.text.trim() !== '')
      .map((item) => ({ titulo: item.text.trim(), isConcluido: item.isChecked === true }))
    if (itens.length === 0) {
      rascunho.avisos.push(`${titulo || nomeArquivo}: lista vazia.`)
      return rascunho
    }
    rascunho.grupos.push({
      chave: `${origem}:g`,
      titulo: titulo || 'Lista do Keep',
      itens,
      categoria: rotulo,
    })
    for (const anexo of nota.attachments ?? []) {
      rascunho.ignorados.push(`${nomeSemPasta(anexo.filePath)}: grupo não tem anexos.`)
    }
    return rascunho
  }

  const texto = (nota.textContent ?? '').trim()
  const [primeiraLinha = '', ...resto] = texto.split('\n')
  const tituloDaNota = titulo || primeiraLinha.trim()
  const conteudo = titulo ? texto : resto.join('\n').trim()
  if (!tituloDaNota && !conteudo && !nota.attachments?.length) {
    rascunho.avisos.push(`${nomeArquivo}: nota vazia.`)
    return rascunho
  }

  const anexosDaNota: AnexoImportado[] = []
  for (const anexo of nota.attachments ?? []) {
    const nome = nomeSemPasta(anexo.filePath)
    const blob = anexos.get(nome)
    const isImagem = anexo.mimetype.startsWith('image/')
    const isAudio = AUDIO_QUE_TOCA.includes(anexo.mimetype)
    if (!blob) rascunho.ignorados.push(`${nome}: arquivo não veio junto (use o .zip do Takeout).`)
    else if (isImagem) anexosDaNota.push({ nome, tipo: 'foto', blob })
    else if (isAudio) anexosDaNota.push({ nome, tipo: 'audio', blob })
    else rascunho.ignorados.push(`${nome}: formato ${anexo.mimetype} não suportado.`)
  }
  for (const anotacao of nota.annotations ?? []) {
    const link = esquemaLink.safeParse({ url: anotacao.url ?? '', nome: anotacao.title ?? '' })
    if (link.success) {
      const { url, nome } = link.data
      anexosDaNota.push({ nome: nome || nomeDoLink(url), tipo: 'link', url })
    }
  }

  rascunho.notas.push({
    chave: `${origem}:n`,
    titulo: tituloDaNota,
    conteudo,
    editadaEm: nota.userEditedTimestampUsec
      ? new Date(nota.userEditedTimestampUsec / MICROSSEGUNDOS_POR_MILISSEGUNDO).toISOString()
      : undefined,
    anexos: anexosDaNota,
  })
  if (rotulo)
    rascunho.ignorados.push(`Rótulo “${rotulo}” de “${tituloDaNota}”: nota não tem categoria.`)
  return rascunho
}

/** Arquivo de entrada (escolhido solto ou tirado do .zip). */
export interface ArquivoDeEntrada {
  nome: string
  ler: () => Promise<Uint8Array>
}

const TIPO_POR_EXTENSAO: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  ogg: 'audio/ogg',
  wav: 'audio/wav',
  webm: 'audio/webm',
}

/**
 * Todos os .json do Keep (soltos ou de um .zip), com os anexos que vieram junto. Arquivos que
 * não são do Keep (HTML, Labels.txt) são pulados em silêncio.
 */
export async function lerArquivosDoKeep(
  arquivos: (ArquivoDeEntrada | ArquivoDoZip)[],
): Promise<RascunhoDeImportacao> {
  const anexos = new Map<string, Blob>()
  const jsons: ArquivoDeEntrada[] = []
  for (const arquivo of arquivos) {
    const extensao = arquivo.nome.split('.').pop()?.toLowerCase() ?? ''
    if (extensao === 'json') jsons.push(arquivo)
    else if (TIPO_POR_EXTENSAO[extensao]) {
      const bytes = await arquivo.ler()
      anexos.set(
        nomeSemPasta(arquivo.nome),
        new Blob([bytes as BlobPart], { type: TIPO_POR_EXTENSAO[extensao] }),
      )
    }
  }
  const decodificador = new TextDecoder()
  const rascunhos = await Promise.all(
    jsons.map(async (arquivo, indice) => {
      try {
        const json: unknown = JSON.parse(decodificador.decode(await arquivo.ler()))
        return lerNotaDoKeep(json, nomeSemPasta(arquivo.nome), anexos, `keep${indice}`)
      } catch {
        const rascunho = rascunhoVazio()
        rascunho.avisos.push(`${nomeSemPasta(arquivo.nome)}: JSON inválido.`)
        return rascunho
      }
    }),
  )
  const junto = juntarRascunhos(rascunhos)
  if (jsons.length === 0) junto.avisos.push('Nenhuma nota do Keep (.json) encontrada.')
  return junto
}
