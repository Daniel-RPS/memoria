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
import { ListaDoDia } from '@/features/dia/components/lista-do-dia'
import { NovaTarefa } from '@/features/dia/components/nova-tarefa'
import { NovoGrupo } from '@/features/dia/components/novo-grupo'

interface FolhaDoDiaProps {
  data: DataLocal
  hoje: DataLocal
  filtro: FiltroCategoria
}

/** A folha pautada do dia: pendentes e cards, linhas para criar e o grupo de concluídas. */
export function FolhaDoDia({ data, hoje, filtro }: FolhaDoDiaProps) {
  const categorias = useCategoriasDoContexto()
  const { entradas, concluidas, gruposConcluidos, subtarefasPorTarefa, extras, isCarregando } =
    useTarefasDoDia(data, filtro)
  const isVazio = !isCarregando && entradas.length === 0
  // Tudo o que dá para selecionar: tarefas soltas, cards e itens pendentes.
  const idsSelecionaveis = entradas.flatMap((entrada) =>
    entrada.tipo === 'tarefa'
      ? [entrada.tarefa.id]
      : [entrada.grupo.instancia.id, ...entrada.grupo.pendentes.map((item) => item.id)],
  )
  const idsGrupos = entradas.flatMap((entrada) =>
    entrada.tipo === 'grupo' ? [entrada.grupo.instancia.id] : [],
  )
  const selecao = useSelecao()
  const nomeDoFiltro = filtro.categoriaId
    ? classificarTarefa(
        { categoryId: filtro.categoriaId, subcategoryId: filtro.subcategoriaId },
        categorias,
      )?.rotulo
    : undefined

  function mensagemVazia() {
    if (concluidas.length > 0 || gruposConcluidos.length > 0) return 'Tudo feito neste dia.'
    if (nomeDoFiltro) return `Nada de ${nomeDoFiltro} neste dia. Escreva abaixo para criar.`
    return 'Nada marcado para este dia. Escreva a primeira tarefa abaixo.'
  }

  return (
    <ContextoSelecao.Provider value={selecao}>
      <ContextoExtras.Provider value={extras}>
        <section aria-label="Tarefas do dia">
          {data === hoje && <AvisoPendenciasOntem hoje={hoje} />}
          {entradas.length > 0 && !selecao.isSelecionando && (
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
            <ListaDoDia entradas={entradas} subtarefasPorTarefa={subtarefasPorTarefa} hoje={hoje} />
            {!selecao.isSelecionando && (
              <>
                <NovaTarefa data={data} filtro={filtro} />
                <NovoGrupo data={data} filtro={filtro} />
              </>
            )}
          </div>
          {selecao.isSelecionando && (
            <BarraSelecao
              data={data}
              hoje={hoje}
              idsPendentes={idsSelecionaveis}
              idsGrupos={idsGrupos}
            />
          )}
          <GrupoConcluidas
            concluidas={concluidas}
            gruposConcluidos={gruposConcluidos}
            subtarefasPorTarefa={subtarefasPorTarefa}
            hoje={hoje}
          />
        </section>
      </ContextoExtras.Provider>
    </ContextoSelecao.Provider>
  )
}
