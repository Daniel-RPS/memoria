import { CheckSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { DataLocal } from '@/db/types'
import { classificarTarefa, type FiltroCategoria } from '@/lib/categorias'
import { pendentesDo, podeCopiarGrupo } from '@/lib/grupos'
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
  const { entradas, concluidas, subtarefasPorTarefa, extras, isCarregando } = useTarefasDoDia(
    data,
    filtro,
  )
  const isVazio = !isCarregando && entradas.length === 0
  // O que dá para selecionar: tarefas soltas, cards com pendentes e itens pendentes.
  const gruposComPendentes = entradas.flatMap((entrada) =>
    entrada.tipo === 'grupo' && podeCopiarGrupo(entrada.grupo) ? [entrada.grupo] : [],
  )
  const idsGrupos = gruposComPendentes.map((grupo) => grupo.card.id)
  const idsItens = gruposComPendentes.flatMap((grupo) => pendentesDo(grupo).map((item) => item.id))
  const idsSelecionaveis = entradas.flatMap((entrada) =>
    entrada.tipo === 'tarefa'
      ? [entrada.tarefa.id]
      : podeCopiarGrupo(entrada.grupo)
        ? [entrada.grupo.card.id, ...pendentesDo(entrada.grupo).map((item) => item.id)]
        : [],
  )
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
          {entradas.length > 0 && !selecao.isSelecionando && (
            <div className="mt-2 -mb-1 flex justify-end">
              <Button variant="ghost" size="sm" className="text-grafite" onClick={selecao.iniciar}>
                <CheckSquare /> Selecionar
              </Button>
            </div>
          )}
          <div className="mt-2">
            {isVazio && (
              <p className="border-b border-pauta px-4 py-3 text-grafite">{mensagemVazia()}</p>
            )}
            <ListaDoDia
              data={data}
              entradas={entradas}
              subtarefasPorTarefa={subtarefasPorTarefa}
              hoje={hoje}
            />
            {!selecao.isSelecionando && (
              <div className="flex flex-wrap">
                <div className="min-w-0 flex-[2_1_18rem]">
                  <NovaTarefa data={data} filtro={filtro} />
                </div>
                <div className="min-w-0 flex-[1_1_12rem] border-t border-pauta sm:border-t-0 sm:border-l">
                  <NovoGrupo data={data} filtro={filtro} />
                </div>
              </div>
            )}
          </div>
          {selecao.isSelecionando && (
            <BarraSelecao
              data={data}
              hoje={hoje}
              idsPendentes={idsSelecionaveis}
              idsGrupos={idsGrupos}
              idsItens={idsItens}
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
