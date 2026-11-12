import { cn } from 'cn'
import { ListChecks } from 'lucide-react'
import type { DataLocal, GroupItem, Task } from '@/db/types'
import { ContextoSubetapas } from '@/hooks/contexto-subetapas'
import { blocoDe, type Bloco } from '@/domain/ordem-de-exibicao'
import { useAtalhoPrioridade } from '@/hooks/use-atalho-prioridade'
import { useAtalhoDeMovimento, type ListaMovel } from '@/features/dia/hooks/use-movimento-em-lote'
import { ContextoGruposLembrados, useGruposLembrados } from '@/hooks/use-grupos-lembrados'
import { useLayoutDoDia } from '@/hooks/use-layout-do-dia'
import { usePreferenciasDoDia } from '@/hooks/use-preferencias-do-dia'
import { pendentesDo, podeCopiarGrupo } from '@/lib/grupos'
import { contagemDasSoltas, secoesNaOrdem, separarSecoes } from '@/lib/visao-do-dia'
import { ContextoExtras } from '@/features/dia/hooks/contexto-extras'
import { ContextoSelecao, useSelecao } from '@/features/dia/hooks/use-selecao'
import { useTarefasDoDia } from '@/features/dia/hooks/use-tarefas-do-dia'
import { AvisoPendenciasOntem } from '@/features/dia/components/aviso-pendencias-ontem'
import { BarraSelecao } from '@/features/dia/components/barra-selecao'
import { CartaoNovoGrupo } from '@/features/dia/components/cartao-novo-grupo'
import { FerramentasDoDia } from '@/features/dia/components/ferramentas-do-dia'
import { GrupoConcluidas } from '@/features/dia/components/grupo-concluidas'
import { GrupoConcluidasDoCard } from '@/features/dia/components/grupo-concluidas-do-card'
import { LinhaItem } from '@/features/dia/components/linha-item'
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
 * A folha do dia em Lista, Colunas ou Cartões.
 */
export function FolhaDoDia({ data, hoje }: FolhaDoDiaProps) {
  const { entradas, concluidas, subtarefasPorTarefa, extras, isCarregando } = useTarefasDoDia(data)
  const { modo, ordem, handleEscolherModo, handleEscolherOrdem } = usePreferenciasDoDia()
  const { isSecaoRecolhida, handleAlternarSecao } = useLayoutDoDia()
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
  // Tecla P: a linha em foco ou, sem foco numa linha, o que está selecionado.
  const selecionadas = idsSelecionaveis.filter((id) => selecao.selecionados.has(id))
  useAtalhoPrioridade({
    tarefas: selecionadas.filter((id) => !idsGrupos.includes(id) && !idsItens.includes(id)),
    itens: selecionadas.filter((id) => idsItens.includes(id)),
  })
  // Alt+↑/↓: sobe e desce as selecionadas dentro da lista delas (soltas ou card).
  const listasMoveis: ListaMovel[] = [
    { destino: { tipo: 'soltas' }, ids: soltas.map((tarefa) => tarefa.id) },
    ...cards.map((grupo) => ({
      destino: { tipo: 'card' as const, cardId: grupo.card.id },
      ids: pendentesDo(grupo).map((item) => item.id),
    })),
  ]
  const registrosDasLinhas = new Map<string, Task | GroupItem>([
    ...soltas.map((tarefa) => [tarefa.id, tarefa] as const),
    ...cards.flatMap((grupo) => pendentesDo(grupo).map((item) => [item.id, item] as const)),
  ])
  const blocoDoId = (id: string): Bloco | undefined => {
    const registro = registrosDasLinhas.get(id)
    return registro ? blocoDe(registro) : undefined
  }
  useAtalhoDeMovimento({
    selecao,
    listas: listasMoveis,
    blocoDoId,
    subetapasPorDono: subtarefasPorTarefa,
  })
  const gruposLembrados = useGruposLembrados()
  const isColunas = modo === 'colunas'
  const isCartoes = modo === 'cartoes'
  const [primeira, segunda] = secoesNaOrdem(ordem)
  const contagemSoltas = contagemDasSoltas(soltas.length, concluidas.length)

  function colunasDaGrade() {
    const isPrimeiraRecolhida = isSecaoRecolhida(primeira)
    const isSegundaRecolhida = isSecaoRecolhida(segunda)
    if (isPrimeiraRecolhida && isSegundaRecolhida) return COLUNAS_DA_GRADE.ambas
    if (isPrimeiraRecolhida) return COLUNAS_DA_GRADE.primeira
    if (isSegundaRecolhida) return COLUNAS_DA_GRADE.segunda
    return COLUNAS_DA_GRADE.nenhuma
  }

  return (
    <ContextoSelecao.Provider value={selecao}>
      <ContextoSubetapas.Provider value={subtarefasPorTarefa}>
        <ContextoExtras.Provider value={extras}>
          <ContextoGruposLembrados.Provider value={gruposLembrados}>
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
                  if (isCartoes) {
                    const textoVazioSoltas =
                      !isCarregando && soltas.length === 0
                        ? concluidas.length > 0
                          ? 'Nenhuma tarefa solta pendente'
                          : 'Nenhuma tarefa solta'
                        : undefined

                    const cartoesGrupos = cards.map((grupo) => {
                      const itensConcluidos = grupo.itens.filter(
                        (item) => item.status === 'concluido' || item.status === 'transferido',
                      )
                      const blocoConcluidas =
                        itensConcluidos.length > 0 ? (
                          <GrupoConcluidasDoCard quantidade={itensConcluidos.length}>
                            <div className="grid grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] items-start gap-2.5 pt-1">
                              {itensConcluidos.map((item) => (
                                <LinhaItem
                                  key={item.id}
                                  item={item}
                                  data={grupo.card.data}
                                  hoje={hoje}
                                  variant="card"
                                />
                              ))}
                            </div>
                          </GrupoConcluidasDoCard>
                        ) : undefined

                      return listas.renderGrupoCard(grupo, { concluidas: blocoConcluidas })
                    })

                    const cartaoNovo = (
                      <CartaoNovoGrupo
                        key="cartao-novo-grupo"
                        data={data}
                        isSemAdicionar={selecao.isSelecionando}
                      />
                    )

                    const secaoGrupos = (
                      <SecaoDoDia
                        key="secao-grupos"
                        titulo="Grupos"
                        contagem={{
                          texto: String(cards.length),
                          rotulo: cards.length === 1 ? '1 grupo' : `${cards.length} grupos`,
                        }}
                        isRecolhida={isSecaoRecolhida('grupos')}
                        onAlternar={() => handleAlternarSecao('grupos')}
                        isSemAdicionar={selecao.isSelecionando}
                        textoVazio={
                          !isCarregando && cards.length === 0 ? 'Nenhum grupo neste dia' : undefined
                        }
                      >
                        <div className="mt-3 flex flex-col gap-4 w-full">
                          {cartoesGrupos}
                          {cartaoNovo}
                        </div>
                      </SecaoDoDia>
                    )

                    const secaoSoltas = (
                      <SecaoDoDia
                        key="secao-soltas"
                        titulo="Tarefas soltas"
                        contagem={contagemSoltas}
                        rotuloAdicionar="Nova tarefa"
                        icone={<ListChecks className="size-4 text-grafite" />}
                        isRecolhida={isSecaoRecolhida('soltas')}
                        onAlternar={() => handleAlternarSecao('soltas')}
                        isSemAdicionar={selecao.isSelecionando}
                        textoVazio={textoVazioSoltas}
                        campo={(fechar) => <NovaTarefa data={data} onFechar={fechar} />}
                      >
                        <div className="mt-3 w-full">
                          {listas.renderSoltasCard({
                            contagemTexto: contagemSoltas.texto,
                            concluidas: (
                              <GrupoConcluidas
                                concluidas={concluidas}
                                subtarefasPorTarefa={subtarefasPorTarefa}
                                hoje={hoje}
                                variant="card"
                              />
                            ),
                            isSemAdicionar: selecao.isSelecionando,
                          })}
                        </div>
                      </SecaoDoDia>
                    )

                    const secoesOrdenadas =
                      ordem === 'soltas'
                        ? [secaoSoltas, secaoGrupos]
                        : [secaoGrupos, secaoSoltas]

                    return (
                      <div
                        data-modo={modo}
                        className="mt-2 flex flex-col gap-6 w-full"
                      >
                        {secoesOrdenadas}
                      </div>
                    )
                  }

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
                        isRecolhida={isSecaoRecolhida('grupos')}
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
                        isRecolhida={isSecaoRecolhida('soltas')}
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
              {(selecao.isSelecionando || selecao.temSelecao) && (
                <BarraSelecao
                  data={data}
                  hoje={hoje}
                  idsPendentes={idsSelecionaveis}
                  idsGrupos={idsGrupos}
                  idsItens={idsItens}
                />
              )}
            </section>
          </ContextoGruposLembrados.Provider>
        </ContextoExtras.Provider>
      </ContextoSubetapas.Provider>
    </ContextoSelecao.Provider>
  )
}
