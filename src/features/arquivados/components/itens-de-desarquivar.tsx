import { format } from 'date-fns'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import type { DataLocal } from '@/db/types'
import { deDataLocal } from '@/lib/datas'
import type { ItemArquivado } from '@/lib/arquivados'
import type { AcoesDaLinha } from '@/features/arquivados/components/acoes-da-linha'

interface ItensDeDesarquivarProps {
  item: ItemArquivado
  hoje: DataLocal
  acoes: AcoesDaLinha
}

/**
 * "Voltar para 28/10" · "Trazer para hoje" · "Escolher dia…". A primeira opção é a sugerida: o
 * dia que tinha, ou hoje se esse dia já passou.
 */
export function ItensDeDesarquivar({ item, hoje, acoes }: ItensDeDesarquivarProps) {
  const original = item.data!
  const voltar = (
    <DropdownMenuItem key="voltar" onSelect={() => acoes.onDesarquivar([item], original)}>
      Voltar para {format(deDataLocal(original), 'dd/MM')}
    </DropdownMenuItem>
  )
  const trazer = (
    <DropdownMenuItem key="hoje" onSelect={() => acoes.onDesarquivar([item], hoje)}>
      Trazer para hoje
    </DropdownMenuItem>
  )
  const escolher = (
    <DropdownMenuItem key="escolher" onSelect={() => acoes.onEscolherDia(item)}>
      Escolher dia…
    </DropdownMenuItem>
  )
  if (original === hoje) return <>{[trazer, escolher]}</>
  return <>{original > hoje ? [voltar, trazer, escolher] : [trazer, voltar, escolher]}</>
}
