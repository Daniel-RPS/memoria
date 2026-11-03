import type { DestinoDoDesarquivar } from '@/db/repositories/arquivo-repository'
import type { ItemArquivado } from '@/lib/arquivados'

/** O que a tela deixa cada linha fazer; quem grava é a página. */
export interface AcoesDaLinha {
  onDesarquivar: (itens: ItemArquivado[], destino?: DestinoDoDesarquivar) => void
  onEscolherDia: (item: ItemArquivado) => void
  onAbrir: (item: ItemArquivado) => void
  onExcluir: (itens: ItemArquivado[]) => void
}
