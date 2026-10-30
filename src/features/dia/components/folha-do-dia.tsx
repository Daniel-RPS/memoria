import { CheckSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { DataLocal } from '@/db/types'
import { classificarTarefa, type FiltroCategoria } from '@/lib/categorias'
import { useCategoriasDoContexto } from '@/hooks/contexto-categorias'
import { ContextoExtras } from '@/features/dia/hooks/contexto-extras'
import { ContextoSelecao, useSelecao } from '@/features/dia/hooks/use-selecao'
import { useTarefasDoDia } from '@/features/dia/hooks/use-tarefas-do-dia'
import { AvisoPendenciasOntem } from '@/features/dia/components/aviso-pendencias-ontem'
import { BarraSelecao } from '@/features/dia/components/barra-selecao'
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
  const categorias = useCategoriasDoContexto()
  const { pendentes, concluidas, subtarefasPorTarefa, extras, isCarregando } = useTarefasDoDia(
    data,
    filtro,
  )
  const isVazio = !isCarregando && pendentes.length === 0
  const selecao = useSelecao()
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
    <ContextoSelecao.Provider value={selecao}>
      <ContextoExtras.Provider value={extras}>
        <section aria-label="Tarefas do dia">
          {data === hoje && <AvisoPendenciasOntem hoje={hoje} />}
          {pendentes.length > 0 && !selecao.isSelecionando && (
            <div className="mt-6 -mb-3 flex justify-end">
              <Button variant="ghost" size="sm" className="text-grafite" onClick={selecao.iniciar}>
                <CheckSquare /> Selecionar
              </Button>
            </div>
          )}
          <div className="mt-6 rounded-md border border-pauta bg-papel">
            {isVazio && (
              <p className="border-b border-pauta px-4 py-3 text-grafite">{mensagemVazia()}</p>
            )}
            <ListaPendentes
              pendentes={pendentes}
              subtarefasPorTarefa={subtarefasPorTarefa}
              hoje={hoje}
            />
            {!selecao.isSelecionando && <NovaTarefa data={data} filtro={filtro} />}
          </div>
          {selecao.isSelecionando && (
            <BarraSelecao
              data={data}
              hoje={hoje}
              idsPendentes={pendentes.map((tarefa) => tarefa.id)}
            />
          )}
          <GrupoConcluidas
            concluidas={concluidas}
            subtarefasPorTarefa={subtarefasPorTarefa}
            hoje={hoje}
          />
        </section>
      </ContextoExtras.Provider>
    </ContextoSelecao.Provider>
  )
}
