import { MARCA_DO_APP } from '@/lib/backup'
import { TAMANHO_MAXIMO_BYTES, TAMANHO_MAXIMO_TEXTO } from '@/lib/importar/rascunho'

/**
 * De onde vem o conteúdo e quais arquivos cada origem aceita. Tudo é lido só no navegador:
 * nada é enviado para fora.
 */

export type OrigemDaImportacao = 'texto' | 'csv' | 'keep' | 'memoria'

export const ORIGENS: Record<
  OrigemDaImportacao,
  { rotulo: string; descricao: string; aceita: string; isVarios: boolean }
> = {
  texto: {
    rotulo: 'Texto ou Markdown',
    descricao: 'Cole o texto ou escolha .txt e .md: listas, tarefas com [ ] e [x], títulos com #.',
    aceita: '.txt,.md,.markdown,text/plain,text/markdown',
    isVarios: true,
  },
  csv: {
    rotulo: 'Planilha CSV',
    descricao: 'Uma tarefa por linha; na prévia você diz qual coluna é título, data, grupo…',
    aceita: '.csv,text/csv',
    isVarios: false,
  },
  keep: {
    rotulo: 'Google Keep',
    descricao:
      'O .zip do Google Takeout ou os .json das notas: textos viram notas, listas viram grupos.',
    aceita: '.zip,.json,application/zip,application/json',
    isVarios: true,
  },
  memoria: {
    rotulo: 'Backup do MemorIA',
    descricao:
      'Traga só uma parte de um backup (procedimentos, notas, uma categoria) sem apagar nada.',
    aceita: '.json,application/json',
    isVarios: false,
  },
}

/** Mensagem para arquivos grandes demais; `null` se cabem. */
export function conferirTamanho(arquivos: { size: number }[]) {
  const total = arquivos.reduce((soma, arquivo) => soma + arquivo.size, 0)
  if (total > TAMANHO_MAXIMO_BYTES) {
    return `Os arquivos passam de ${TAMANHO_MAXIMO_TEXTO}. Escolha menos arquivos ou um arquivo menor.`
  }
  return null
}

function extensao(nome: string) {
  return nome.split('.').pop()?.toLowerCase() ?? ''
}

/**
 * A origem provável de arquivos soltos na janela (sem o usuário ter escolhido antes): pela
 * extensão; um .json é backup do MemorIA se o começo dele disser isso, senão nota do Keep.
 */
export function detectarOrigem(
  arquivos: { nome: string; inicio: string }[],
): OrigemDaImportacao | null {
  const [primeiro] = arquivos
  if (!primeiro) return null
  const tipo = extensao(primeiro.nome)
  if (tipo === 'csv') return 'csv'
  if (tipo === 'zip') return 'keep'
  if (tipo === 'md' || tipo === 'markdown' || tipo === 'txt') return 'texto'
  if (tipo === 'json') return primeiro.inicio.includes(`"${MARCA_DO_APP}"`) ? 'memoria' : 'keep'
  return null
}

/** Arquivos que a origem aceita (pela extensão); os outros são recusados com aviso. */
export function isAceitoPela(origem: OrigemDaImportacao, nome: string) {
  const tipo = `.${extensao(nome)}`
  return ORIGENS[origem].aceita.split(',').includes(tipo)
}
