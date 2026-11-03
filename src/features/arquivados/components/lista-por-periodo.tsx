import type { DataLocal } from '@/db/types'
import { agruparPorPeriodo, type ItemArquivado } from '@/lib/arquivados'
import type { AcoesDaLinha } from '@/features/arquivados/components/acoes-da-linha'
import { LinhaArquivado } from '@/features/arquivados/components/linha-arquivado'

interface ListaPorPeriodoProps {
  itens: ItemArquivado[]
  hoje: DataLocal
  selecionados: Set<string>
  onSelecionar: (item: ItemArquivado, isSelecionado: boolean) => void
  acoes: AcoesDaLinha
}

/** Linhas do mais recente ao mais antigo, com separadores: Esta semana · Este mês · Mais antigos. */
export function ListaPorPeriodo({
  itens,
  hoje,
  selecionados,
  onSelecionar,
  acoes,
}: ListaPorPeriodoProps) {
  return (
    <div className="flex flex-col">
      {agruparPorPeriodo(itens, hoje).map((grupo) => (
        <div key={grupo.periodo} role="group" aria-label={grupo.rotulo}>
          <h3 className="px-2 pt-3 pb-1 text-xs font-semibold tracking-wide text-grafite uppercase first:pt-0">
            {grupo.rotulo}
          </h3>
          <ul>
            {grupo.itens.map((item) => (
              <LinhaArquivado
                key={item.chave}
                item={item}
                hoje={hoje}
                isSelecionado={selecionados.has(item.chave)}
                onSelecionar={(isSelecionado) => onSelecionar(item, isSelecionado)}
                acoes={acoes}
              />
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
