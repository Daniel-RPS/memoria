import { z } from 'zod'
import type { Attachment, DataLocal, Dono, TipoDono } from '@/db/types'
import {
  maesDasSubcategorias,
  preencherOrdem,
  religarACategoriaMae,
  separarPorTipo,
} from '@/lib/categorias'
import { diasEntre, hoje } from '@/lib/datas'
import { converterGruposAntigos } from '@/lib/migracao-grupos'
import { converterProcedimentoAntigo } from '@/lib/migracao-procedimentos'
import { preencherCadeias } from '@/lib/grupos'
import { esquemaIcone } from '@/lib/icones'
import { converterNotaAntiga } from '@/lib/notas'

/** Identifica o arquivo como backup do MemorIA. */
export const MARCA_DO_APP = 'MemorIA'
/** Versão do formato do arquivo; mude só se a estrutura do JSON mudar. */
export const FORMATO_ATUAL = 14

const dataLocal = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data fora do formato AAAA-MM-DD.')
const texto = z.string()
const id = z.string().min(1)
const base = { id, criadoEm: texto, atualizadoEm: texto }
// Formato 8 (emoji/marca); 9 aceita também `generico`. Ícone quebrado (ou de uma versão futura) é ignorado: o registro entra sem ícone.
const icone = esquemaIcone.optional().catch(undefined)

// `ordem` desde o formato 5 e `tipo` desde o 6; antes, preenchidos ao ler (`preencherOrdem`,
// `separarPorTipo`, a mesma regra da migração do banco).
const categoria = z.object({
  ...base,
  nome: texto,
  cor: texto,
  tipo: z.enum(['grupo', 'procedimento']).optional(),
  ordem: z.number().optional(),
  icone,
})
// Até o formato 13: subcategorias. Ao ler, quem usava uma fica na categoria-mãe e elas somem.
const subcategoriaAntiga = z.object({ id, categoryId: id })

// Formato 13: posição arrastada dentro do bloco do topo (prioridade/em andamento).
const ordemNoTopo = z.object({ chave: texto, posicao: z.number() }).optional().catch(undefined)

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
  // Formato 10; antes, quem estava arquivado ganha a data da última alteração ao ler.
  arquivadoEm: texto.optional(),
  // Formato 11; backups anteriores entram como "não está em andamento".
  emAndamento: z.boolean().optional(),
  emAndamentoDesde: texto.optional(),
  // Formato 13; backups anteriores entram como "concluída direto" e sem prioridade.
  concluidaPelasSubetapas: z.boolean().optional(),
  prioridade: z.boolean().optional(),
  prioridadeDesde: texto.optional(),
  ordemNoTopo,
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
  arquivadoEm: texto.optional(),
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
  // Formato 7; antes, calculada ao ler (`preencherCadeias`, a mesma regra da migração v10).
  cadeiaId: texto.optional(),
  dataOriginal: dataLocal,
  arquivadoEm: texto.optional(),
  // Formato 11.
  emAndamento: z.boolean().optional(),
  emAndamentoDesde: texto.optional(),
  // Formato 13.
  concluidaPelasSubetapas: z.boolean().optional(),
  prioridade: z.boolean().optional(),
  prioridadeDesde: texto.optional(),
  ordemNoTopo,
})

const subtarefa = z.object({
  ...base,
  taskId: id,
  titulo: texto,
  concluida: z.boolean(),
  ordem: z.number(),
})

const procedimento = z.object({
  ...base,
  titulo: texto,
  categoryId: texto.optional(),
  // Formatos 5 a 13; religada à categoria-mãe ao ler.
  subcategoryId: texto.optional(),
  etapas: z.array(z.object({ id, texto, ordem: z.number() })),
  icone,
  // Formato 10; backups antigos entram como não arquivados.
  arquivado: z.boolean().optional(),
  arquivadoEm: texto.optional(),
})

// Formatos 1 a 3: seções com passos e subpassos. Viram etapas como na migração do banco (v7).
const procedimentoAntigo = z
  .object({
    ...base,
    titulo: texto,
    categoryId: texto.optional(),
    secoes: z.array(
      z.object({
        passos: z.array(
          z.object({ id, texto, subpassos: z.array(z.object({ id, texto })).optional() }),
        ),
      }),
    ),
  })
  .transform(converterProcedimentoAntigo)

// 'procedure' e 'step' só existem em backups até o formato 3; são descartados ao ler.
const dono = z.object({ tipo: z.enum(['task', 'note', 'procedure', 'step']), id })
const DONOS_ATUAIS = new Set<string>(['task', 'note'] satisfies TipoDono[])
const isDonoAtual = (valor: z.infer<typeof dono>): valor is Dono => DONOS_ATUAIS.has(valor.tipo)

// `vinculo` desde o formato 7; antes, a anotação da tarefa tinha `dono` (vira nota ligada à
// tarefa, as outras ficam avulsas, como na migração v10).
const nota = z.object({
  ...base,
  titulo: texto,
  conteudo: texto,
  vinculo: z.object({ tipo: z.enum(['tarefa', 'grupo', 'item']), id }).optional(),
  dono: dono.optional(),
  arquivado: z.boolean().optional(),
  arquivadoEm: texto.optional(),
})

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

// Formato 12: sessões de tempo em andamento; backups anteriores entram sem sessões.
const sessaoDeTempo = z.object({
  ...base,
  tarefaId: texto.optional(),
  itemId: texto.optional(),
  cadeiaId: texto.optional(),
  grupoId: texto.optional(),
  categoryId: texto.optional(),
  inicio: texto,
  fim: texto.optional(),
})

/** Backup anterior ao formato 10 não guardava quando arquivou: vale a última alteração. */
function comArquivadoEm<T extends { atualizadoEm: string; arquivadoEm?: string | undefined }>(
  registro: T,
  isArquivado: boolean,
): T {
  return isArquivado && !registro.arquivadoEm
    ? { ...registro, arquivadoEm: registro.atualizadoEm }
    : registro
}

export const esquemaBackup = z.object({
  app: z.literal(MARCA_DO_APP, { error: 'Este arquivo não é um backup do MemorIA.' }),
  formato: z.number().int(),
  versaoBanco: z.number().int(),
  exportadoEm: texto,
  tabelas: z
    .object({
      categories: z.array(categoria),
      subcategories: z.array(subcategoriaAntiga).optional(),
      tasks: z.array(tarefa),
      subtasks: z.array(subtarefa),
      procedures: z.array(z.union([procedimento, procedimentoAntigo])),
      notes: z.array(nota),
      attachments: z.array(anexoNoArquivo),
      // Formato 1 não tinha grupos.
      groupSeries: z.array(serieDeGrupo).default([]),
      groupCards: z.array(cardDeGrupo).default([]),
      groupItems: z.array(itemDeGrupo).default([]),
      // Formato 2: cards se chamavam instâncias e os itens eram tarefas.
      groupInstances: z.array(cardDeGrupo).optional(),
      // Formato 12: sessões de tempo.
      sessions: z.array(sessaoDeTempo).default([]),
    })
    .transform(({ groupInstances, subcategories, ...lidas }) => {
      const maeDe = maesDasSubcategorias(subcategories ?? [])
      const religar = <T extends { categoryId?: string; subcategoryId?: string }>(itens: T[]) =>
        itens.map((item) => religarACategoriaMae(item, maeDe))
      const { tasks, notes, attachments, ...tabelas } = {
        ...lidas,
        tasks: religar(lidas.tasks),
        groupSeries: religar(lidas.groupSeries),
        procedures: religar(lidas.procedures),
      }
      const { cards, itens, soltas } = converterGruposAntigos(groupInstances ?? [], tasks)
      const { categorias, procedimentos } = separarPorTipo({
        categorias: preencherOrdem(tabelas.categories),
        tarefas: soltas,
        grupos: tabelas.groupSeries,
        procedimentos: tabelas.procedures,
      })
      return {
        ...tabelas,
        categories: categorias,
        procedures: procedimentos,
        notes: notes.flatMap((nota) => {
          if (nota.dono && !isDonoAtual(nota.dono)) return []
          return [converterNotaAntiga(nota, new Set(soltas.map((tarefa) => tarefa.id)))]
        }),
        attachments: attachments.flatMap((anexo) =>
          isDonoAtual(anexo.dono) ? [{ ...anexo, dono: anexo.dono }] : [],
        ),
        tasks: soltas.map((tarefa) => comArquivadoEm(tarefa, tarefa.status === 'arquivada')),
        groupCards: [...tabelas.groupCards, ...cards].map((card) =>
          comArquivadoEm(card, card.arquivado),
        ),
        groupItems: preencherCadeias([...tabelas.groupItems, ...itens]).map((item) =>
          comArquivadoEm(item, item.status === 'arquivado'),
        ),
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
  procedures: ['procedimento', 'procedimentos'],
  notes: ['nota', 'notas'],
  attachments: ['anexo', 'anexos'],
  groupSeries: ['grupo', 'grupos'],
  groupCards: ['card de grupo', 'cards de grupo'],
  groupItems: ['item de grupo', 'itens de grupo'],
  sessions: ['sessão de tempo', 'sessões de tempo'],
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

/** Depois de quantos dias sem backup a barra lateral lembra de fazer um. */
export const DIAS_PARA_LEMBRAR_BACKUP = 7

/**
 * Se é hora de lembrar do backup: há dados e o último backup (momento ISO, contado pelo dia
 * local) foi há mais de `DIAS_PARA_LEMBRAR_BACKUP` dias, ou nunca houve um. Sem dados não há o
 * que guardar.
 */
export function isBackupAtrasado(ultimo: string | null, dataHoje: DataLocal, hasDados: boolean) {
  if (!hasDados) return false
  if (!ultimo) return true
  const momento = new Date(ultimo)
  if (Number.isNaN(momento.getTime())) return true
  return diasEntre(hoje(momento), dataHoje) > DIAS_PARA_LEMBRAR_BACKUP
}
