import { useState } from 'react'
import { cn } from 'cn'
import type { DataLocal } from '@/db/types'
import { ContextoGruposDaVisita, useGruposDaVisita } from '@/hooks/use-grupos-da-visita'
import { usePreferenciasDoDia } from '@/hooks/use-preferencias-do-dia'
import { pendentesDo, podeCopiarGrupo } from '@/lib/grupos'
import {
  contagemDasSoltas,
  secoesNaOrdem,
  separarSecoes,
  type SecaoDoDia as TipoDeSecao,
} from '@/lib/visao-do-dia'
import { ContextoExtras } from '@/features/dia/hooks/contexto-extras'
import { ContextoSelecao, useSelecao } from '@/features/dia/hooks/use-selecao'
import { useTarefasDoDia } from '@/features/dia/hooks/use-tarefas-do-dia'
import { AvisoPendenciasOntem } from '@/features/dia/components/aviso-pendencias-ontem'
import { BarraSelecao } from '@/features/dia/components/barra-selecao'
import { FerramentasDoDia } from '@/features/dia/components/ferramentas-do-dia'
import { GrupoConcluidas } from '@/features/dia/components/grupo-concluidas'
import { ListaDoDia } from '@/features/dia/components/lista-do-dia'
import { NovaTarefa } from '@/features/dia/components/nova-tarefa'
import { NovoGrupo } from '@/features/dia/components/novo-grupo'
import { SecaoDoDia } from '@/features/dia/components/secao-do-dia'

interface FolhaDoDiaProps {
  data: DataLocal
  hoje: DataLocal
}

/** Largura da faixa de uma coluna recolhida no modo Colunas. */
const COLUNAS_DA_GRADE = {
  nenhuma: '@min-[48rem]:grid-cols-2',
  primeira: '@min-[48rem]:grid-cols-[2.75rem_1fr]',
  segunda: '@min-[48rem]:grid-cols-[1fr_2.75rem]',
  ambas: '@min-[48rem]:grid-cols-[2.75rem_2.75rem]',
}

/**
 * A folha do dia em duas seções fixas, "Grupos" e "Tarefas soltas", empilhadas (Lista) ou lado
 * a lado (Colunas, só com espaço: estreita, volta a empilhar sem mudar a preferência). As
 * seções abrem expandidas a cada visita; os grupos dentro delas, recolhidos.
 */
export function FolhaDoDia({ data, hoje }: FolhaDoDiaProps) {
  const { entradas, concluidas, subtarefasPorTarefa, extras, isCarregando } = useTarefasDoDia(data)
  const { modo, ordem, handleEscolherModo, handleEscolherOrdem } = usePreferenciasDoDia()
  const [recolhidas, setRecolhidas] = useState<ReadonlySet<TipoDeSecao>>(() => new Set())
  const { grupos: cards, soltas } = separarSecoes(entradas)
  // O que dá para selecionar: tarefas soltas, cards com pendentes e itens pendentes.
  const gruposComPendentes = cards.filter(podeCopiarGrupo)
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
  // A folha é montada de novo a cada dia (`key` na DiaPage): os grupos abrem recolhidos.
  const gruposDaVisita = useGruposDaVisita(
    isCarregando ? undefined : cards.map((grupo) => grupo.card.id),
  )
  const isColunas = modo === 'colunas'
  const [primeira, segunda] = secoesNaOrdem(ordem)
  const contagemSoltas = contagemDasSoltas(soltas.length, concluidas.length)

  function handleAlternarSecao(secao: TipoDeSecao) {
    setRecolhidas((atuais) => {
      const novas = new Set(atuais)
      if (!novas.delete(secao)) novas.add(secao)
      return novas
    })
  }

  function colunasDaGrade() {
    const isPrimeiraRecolhida = recolhidas.has(primeira)
    const isSegundaRecolhida = recolhidas.has(segunda)
    if (isPrimeiraRecolhida && isSegundaRecolhida) return COLUNAS_DA_GRADE.ambas
    if (isPrimeiraRecolhida) return COLUNAS_DA_GRADE.primeira
    if (isSegundaRecolhida) return COLUNAS_DA_GRADE.segunda
    return COLUNAS_DA_GRADE.nenhuma
  }

  return (
    <ContextoSelecao.Provider value={selecao}>
      <ContextoExtras.Provider value={extras}>
        <ContextoGruposDaVisita.Provider value={gruposDaVisita}>
          <section aria-label="Tarefas do dia" className="@container">
            {data === hoje && <AvisoPendenciasOntem hoje={hoje} />}
            {!selecao.isSelecionando && (
              <FerramentasDoDia
                modo={modo}
                ordem={ordem}
                onEscolherModo={handleEscolherModo}
                onEscolherOrdem={handleEscolherOrdem}
                onSelecionar={entradas.length > 0 ? selecao.iniciar : undefined}
              />
            )}
            <ListaDoDia
              data={data}
              entradas={entradas}
              subtarefasPorTarefa={subtarefasPorTarefa}
              hoje={hoje}
            >
              {(listas) => {
                const secoes = {
                  grupos: (
                    <SecaoDoDia
                      key="grupos"
                      titulo="Grupos"
                      contagem={{
                        texto: String(cards.length),
                        rotulo: cards.length === 1 ? '1 grupo' : `${cards.length} grupos`,
                      }}
                      rotuloAdicionar="Novo grupo"
                      isRecolhida={recolhidas.has('grupos')}
                      onAlternar={() => handleAlternarSecao('grupos')}
                      isFaixa={isColunas}
                      isSemAdicionar={selecao.isSelecionando}
                      textoVazio={
                        !isCarregando && cards.length === 0 ? 'Nenhum grupo neste dia' : undefined
                      }
                      campo={(fechar) => <NovoGrupo data={data} onCriado={fechar} />}
                    >
                      {listas.grupos}
                    </SecaoDoDia>
                  ),
                  soltas: (
                    <SecaoDoDia
                      key="soltas"
                      titulo="Tarefas soltas"
                      contagem={contagemSoltas}
                      rotuloAdicionar="Nova tarefa"
                      isRecolhida={recolhidas.has('soltas')}
                      onAlternar={() => handleAlternarSecao('soltas')}
                      isFaixa={isColunas}
                      isSemAdicionar={selecao.isSelecionando}
                      textoVazio={
                        !isCarregando && soltas.length === 0
                          ? concluidas.length > 0
                            ? 'Nenhuma tarefa solta pendente'
                            : 'Nenhuma tarefa solta'
                          : undefined
                      }
                      campo={(fechar) => <NovaTarefa data={data} onFechar={fechar} />}
                    >
                      {listas.soltas}
                      <GrupoConcluidas
                        concluidas={concluidas}
                        subtarefasPorTarefa={subtarefasPorTarefa}
                        hoje={hoje}
                      />
                    </SecaoDoDia>
                  ),
                }
                return (
                  <div
                    data-modo={modo}
                    className={cn(
                      'mt-2 flex flex-col gap-6',
                      isColunas && ['@min-[48rem]:grid @min-[48rem]:gap-8', colunasDaGrade()],
                    )}
                  >
                    {secoes[primeira]}
                    {secoes[segunda]}
                  </div>
                )
              }}
            </ListaDoDia>
            {selecao.isSelecionando && (
              <BarraSelecao
                data={data}
                hoje={hoje}
                idsPendentes={idsSelecionaveis}
                idsGrupos={idsGrupos}
                idsItens={idsItens}
              />
            )}
          </section>
        </ContextoGruposDaVisita.Provider>
      </ContextoExtras.Provider>
    </ContextoSelecao.Provider>
  )
}
