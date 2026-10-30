import type { DataLocal } from '@/db/types'
import { classificarTarefa, type FiltroCategoria } from '@/lib/categorias'
import { useCategoriasDaFolha } from '@/features/dia/hooks/contexto-categorias'
import { useTarefasDoDia } from '@/features/dia/hooks/use-tarefas-do-dia'
import { GrupoConcluidas } from '@/features/dia/components/grupo-concluidas'
import { ListaPendentes } from '@/features/dia/components/lista-pendentes'
import { NovaTarefa } from '@/features/dia/components/nova-tarefa'

interface FolhaDoDiaProps {
  data: DataLocal
  hoje: DataLocal
  filtro: FiltroCategoria
}

/** A folha pautada do dia: pendentes, linha para nova tarefa e o grupo de concluídas. */
export function FolhaDoDia({ data, hoje, filtro }: FolhaDoDiaProps) {
  const categorias = useCategoriasDaFolha()
  const { pendentes, concluidas, subtarefasPorTarefa, isCarregando } = useTarefasDoDia(data, filtro)
  const isVazio = !isCarregando && pendentes.length === 0
  const nomeDoFiltro = filtro.categoriaId
    ? classificarTarefa(
        { categoryId: filtro.categoriaId, subcategoryId: filtro.subcategoriaId },
        categorias,
      )?.rotulo
    : undefined

  function mensagemVazia() {
    if (concluidas.length > 0) return 'Tudo feito neste dia.'
    if (nomeDoFiltro) return `Nada de ${nomeDoFiltro} neste dia. Escreva abaixo para criar.`
    return 'Nada marcado para este dia. Escreva a primeira tarefa abaixo.'
  }

  return (
    <section aria-label="Tarefas do dia" className="mt-6">
      <div className="rounded-md border border-pauta bg-papel">
        {isVazio && (
          <p className="border-b border-pauta px-4 py-3 text-grafite">{mensagemVazia()}</p>
        )}
        <ListaPendentes
          pendentes={pendentes}
          subtarefasPorTarefa={subtarefasPorTarefa}
          hoje={hoje}
        />
        <NovaTarefa data={data} filtro={filtro} />
      </div>
      <GrupoConcluidas
        concluidas={concluidas}
        subtarefasPorTarefa={subtarefasPorTarefa}
        hoje={hoje}
      />
    </section>
  )
}
