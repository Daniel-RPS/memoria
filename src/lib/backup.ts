import { z } from 'zod'
import type { Attachment, DataLocal } from '@/db/types'
import { converterGruposAntigos } from '@/lib/migracao-grupos'

/** Identifica o arquivo como backup do MemorIA. */
export const MARCA_DO_APP = 'MemorIA'
/** Versão do formato do arquivo; mude só se a estrutura do JSON mudar. */
export const FORMATO_ATUAL = 3

const dataLocal = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data fora do formato AAAA-MM-DD.')
const texto = z.string()
const id = z.string().min(1)
const base = { id, criadoEm: texto, atualizadoEm: texto }

const categoria = z.object({ ...base, nome: texto, cor: texto })
const subcategoria = z.object({ ...base, categoryId: id, nome: texto, cor: texto.optional() })

const tarefa = z.object({
  ...base,
  titulo: texto,
  data: dataLocal,
  categoryId: texto.optional(),
  subcategoryId: texto.optional(),
  ordem: z.number(),
  status: z.enum(['pendente', 'concluida', 'arquivada']),
  dataOriginal: dataLocal,
  concluidaEm: texto.optional(),
  procedureId: texto.optional(),
  // Formato 2: item de grupo era tarefa com card.
  groupInstanceId: texto.optional(),
})

const serieDeGrupo = z.object({
  ...base,
  titulo: texto,
  categoryId: texto.optional(),
  subcategoryId: texto.optional(),
})

const cardDeGrupo = z.object({
  ...base,
  seriesId: id,
  data: dataLocal,
  ordem: z.number(),
  arquivado: z.boolean(),
  // Banco v6; backups anteriores não têm.
  criadoPorTransferencia: z.boolean().optional(),
})

const itemDeGrupo = z.object({
  ...base,
  cardId: id,
  titulo: texto,
  ordem: z.number(),
  status: z.enum(['pendente', 'concluido', 'transferido', 'arquivado']),
  concluidoEm: texto.optional(),
  transferidoParaCardId: texto.optional(),
  origemItemId: texto.optional(),
  dataOriginal: dataLocal,
})

const subtarefa = z.object({
  ...base,
  taskId: id,
  titulo: texto,
  concluida: z.boolean(),
  ordem: z.number(),
})

const passo = z.object({
  id,
  texto,
  codigo: texto.optional(),
  alerta: texto.optional(),
  anexos: z.array(texto),
  subpassos: z.array(z.object({ id, texto })),
})

const procedimento = z.object({
  ...base,
  titulo: texto,
  categoryId: texto.optional(),
  descricao: texto,
  secoes: z.array(z.object({ id, titulo: texto, passos: z.array(passo) })),
  camposVariaveis: z.array(
    z.object({
      id,
      nome: texto,
      tipo: z.enum(['texto', 'numero', 'data', 'credencial']),
      localCredencial: texto.optional(),
    }),
  ),
  versao: z.number().int().positive(),
})

const versaoProcedimento = z.object({
  id,
  procedureId: id,
  versao: z.number().int().positive(),
  snapshot: procedimento,
  alteradoEm: texto,
})

const execucao = z.object({
  ...base,
  procedureId: id,
  versao: z.number().int().positive(),
  data: dataLocal,
  valoresCampos: z.record(z.string(), texto),
  passosMarcados: z.array(texto),
  passosPulados: z.array(texto),
  observacoes: texto,
  taskId: texto.optional(),
  concluidaEm: texto.optional(),
})

const dono = z.object({ tipo: z.enum(['task', 'note', 'procedure', 'step']), id })

const nota = z.object({ ...base, titulo: texto, conteudo: texto, dono: dono.optional() })

/** No arquivo, o conteúdo binário do anexo (foto, desenho, áudio) vai em base64. */
const anexoNoArquivo = z.object({
  ...base,
  dono,
  tipo: z.enum(['foto', 'desenho', 'audio', 'link']),
  nome: texto,
  mime: texto.optional(),
  url: texto.optional(),
  conteudo: z.object({ tipo: texto, base64: z.string() }).optional(),
})

export const esquemaBackup = z.object({
  app: z.literal(MARCA_DO_APP, { error: 'Este arquivo não é um backup do MemorIA.' }),
  formato: z.number().int(),
  versaoBanco: z.number().int(),
  exportadoEm: texto,
  tabelas: z
    .object({
      categories: z.array(categoria),
      subcategories: z.array(subcategoria),
      tasks: z.array(tarefa),
      subtasks: z.array(subtarefa),
      procedures: z.array(procedimento),
      procedureVersions: z.array(versaoProcedimento),
      executions: z.array(execucao),
      notes: z.array(nota),
      attachments: z.array(anexoNoArquivo),
      // Formato 1 não tinha grupos.
      groupSeries: z.array(serieDeGrupo).default([]),
      groupCards: z.array(cardDeGrupo).default([]),
      groupItems: z.array(itemDeGrupo).default([]),
      // Formato 2: cards se chamavam instâncias e os itens eram tarefas.
      groupInstances: z.array(cardDeGrupo).optional(),
    })
    .transform(({ groupInstances, tasks, ...tabelas }) => {
      const { cards, itens, soltas } = converterGruposAntigos(groupInstances ?? [], tasks)
      return {
        ...tabelas,
        tasks: soltas,
        groupCards: [...tabelas.groupCards, ...cards],
        groupItems: [...tabelas.groupItems, ...itens],
      }
    }),
})

export type Backup = z.output<typeof esquemaBackup>
export type AnexoNoArquivo = Backup['tabelas']['attachments'][number]
export type NomeTabela = keyof Backup['tabelas']

/** Nomes legíveis de cada tabela, no singular e no plural. */
export const NOMES_DAS_TABELAS: Record<NomeTabela, [string, string]> = {
  tasks: ['tarefa', 'tarefas'],
  subtasks: ['subtarefa', 'subtarefas'],
  categories: ['categoria', 'categorias'],
  subcategories: ['subcategoria', 'subcategorias'],
  procedures: ['procedimento', 'procedimentos'],
  procedureVersions: ['versão anterior', 'versões anteriores'],
  executions: ['execução', 'execuções'],
  notes: ['nota', 'notas'],
  attachments: ['anexo', 'anexos'],
  groupSeries: ['grupo', 'grupos'],
  groupCards: ['card de grupo', 'cards de grupo'],
  groupItems: ['item de grupo', 'itens de grupo'],
}

export type Quantidades = Record<NomeTabela, number>

/** Quantos registros o backup tem em cada tabela. */
export function quantidadesDoBackup(backup: Pick<Backup, 'tabelas'>): Quantidades {
  const nomes = Object.keys(NOMES_DAS_TABELAS) as NomeTabela[]
  return Object.fromEntries(nomes.map((nome) => [nome, backup.tabelas[nome].length])) as Quantidades
}

/** "312 tarefas", "1 procedimento"… para cada tabela com pelo menos um registro. */
export function resumirQuantidades(quantidades: Quantidades) {
  return (Object.keys(NOMES_DAS_TABELAS) as NomeTabela[])
    .map((nome) => ({ nome, quantidade: quantidades[nome] }))
    .filter(({ quantidade }) => quantidade > 0)
    .map(({ nome, quantidade }) => {
      const [singular, plural] = NOMES_DAS_TABELAS[nome]
      return `${quantidade} ${quantidade === 1 ? singular : plural}`
    })
}

export function nomeDoArquivo(hoje: DataLocal) {
  return `memoria-backup-${hoje}.json`
}

/** Tamanho dos pedaços ao converter para base64 (evita estourar a pilha com arquivos grandes). */
const TAMANHO_PEDACO = 0x8000

export async function blobParaBase64(blob: Blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let binario = ''
  for (let inicio = 0; inicio < bytes.length; inicio += TAMANHO_PEDACO) {
    binario += String.fromCharCode(...bytes.subarray(inicio, inicio + TAMANHO_PEDACO))
  }
  return btoa(binario)
}

export function base64ParaBlob(base64: string, tipo: string) {
  const binario = atob(base64)
  const bytes = new Uint8Array(binario.length)
  for (let indice = 0; indice < binario.length; indice += 1) {
    bytes[indice] = binario.charCodeAt(indice)
  }
  return new Blob([bytes], { type: tipo })
}

export async function anexoParaArquivo(anexo: Attachment): Promise<AnexoNoArquivo> {
  const { blob, ...resto } = anexo
  if (!blob) return resto
  return { ...resto, conteudo: { tipo: blob.type, base64: await blobParaBase64(blob) } }
}

export function anexoDoArquivo(anexo: AnexoNoArquivo): Attachment {
  const { conteudo, ...resto } = anexo
  return conteudo ? { ...resto, blob: base64ParaBlob(conteudo.base64, conteudo.tipo) } : resto
}

export type ResultadoLeitura =
  { isValido: true; backup: Backup } | { isValido: false; mensagem: string }

/**
 * Lê e valida o texto de um arquivo de backup. Nunca lança: devolve a mensagem para o usuário.
 * `versaoBancoAtual` impede importar backup de uma versão mais nova do app.
 */
export function lerBackup(textoArquivo: string, versaoBancoAtual: number): ResultadoLeitura {
  let json: unknown
  try {
    json = JSON.parse(textoArquivo)
  } catch {
    return {
      isValido: false,
      mensagem: 'O arquivo não é um JSON válido. Escolha o .json exportado pelo MemorIA.',
    }
  }
  const resultado = esquemaBackup.safeParse(json)
  if (!resultado.success) {
    const problema = resultado.error.issues[0]
    if (problema.path.length === 0 || problema.path[0] === 'app') {
      return { isValido: false, mensagem: 'Este arquivo não é um backup do MemorIA.' }
    }
    return {
      isValido: false,
      mensagem: `O backup está incompleto ou foi alterado (problema em ${problema.path.join(' › ')}: ${problema.message}). Nada foi importado.`,
    }
  }
  const backup = resultado.data
  if (backup.formato > FORMATO_ATUAL || backup.versaoBanco > versaoBancoAtual) {
    return {
      isValido: false,
      mensagem:
        'Este backup foi feito por uma versão mais nova do MemorIA. Atualize o app para importá-lo.',
    }
  }
  return { isValido: true, backup }
}
