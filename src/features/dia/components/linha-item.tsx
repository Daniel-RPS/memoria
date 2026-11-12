import { useState, type ReactNode } from 'react'
import { CornerDownRight } from 'lucide-react'
import { Link } from 'react-router'
import { cn } from 'cn'
import { FileteDeAndamento, IndicadorAndamento } from '@/components/indicador-andamento'
import { ComBandeira } from '@/components/indicador-prioridade'
import { alvoDePrioridade } from '@/hooks/use-atalho-prioridade'
import { HorarioDaTarefa } from '@/components/horario/horario-da-tarefa'
import { AvisosDaTarefa } from '@/components/lembretes/avisos-da-tarefa'
import { IndicadorNotas } from '@/components/notas/indicador-notas'
import { useDuploCliqueParaEditar } from '@/hooks/use-duplo-clique-para-editar'
import { TituloEditavel } from '@/components/titulo-editavel'
import { TextoComLinks } from '@/components/texto-com-links'
import { Checkbox } from '@/components/ui/checkbox'
import type { DataLocal, GroupItem } from '@/db/types'
import { useSubetapasDe } from '@/hooks/contexto-subetapas'
import { vinculoDoItem } from '@/lib/notas'
import { progressoSubtarefas } from '@/lib/tarefas'
import { diaCurto, isPendenteDeAntes } from '@/lib/grupos'
import { useDataDoDestino } from '@/features/dia/hooks/contexto-extras'
import { useAcoesGrupo } from '@/features/dia/hooks/use-acoes-grupo'
import { useSelecaoDaFolha } from '@/features/dia/hooks/use-selecao'
import { BotaoProgresso } from '@/features/dia/components/botao-progresso'
import { ListaSubtarefas } from '@/features/dia/components/lista-subtarefas'
import { MenuItemGrupo } from '@/features/dia/components/menu-item-grupo'

interface LinhaItemProps {
  item: GroupItem
  /** Dia do card. */
  data: DataLocal
  hoje: DataLocal
  /** Alça de arrastar; só nos pendentes. */
  alca?: ReactNode
  variant?: 'line' | 'card'
}

/** Selo de atraso discreto: texto pequeno no tom de alerta, sem fundo. */
const SELO_DE_ATRASO = 'text-xs font-medium whitespace-nowrap text-alerta'

/**
 * Item de um card. Pendente: caixa e "pendente desde". Feito: riscado. Transferido: seta no
 * lugar da caixa, sem riscar, com a etiqueta que leva ao card do dia de destino.
 * No modo 'card', vira um cartão em grade.
 */
export function LinhaItem({
  item,
  data,
  hoje,
  alca,
  variant = 'line',
}: LinhaItemProps) {
  const { definirConclusaoItem, renomearItem } = useAcoesGrupo()
  const [isEditando, setIsEditando] = useState(false)
  const [isSubetapasAbertas, setIsSubetapasAbertas] = useState(false)
  const [isFocandoNovaSubetapa, setIsFocandoNovaSubetapa] = useState(false)
  const [isHorarioAberto, setIsHorarioAberto] = useState(false)
  const [isAvisosAberto, setIsAvisosAberto] = useState(false)
  const subetapas = useSubetapasDe(item.id)
  const progresso = progressoSubtarefas(subetapas)
  const idPainel = `subetapas-${item.id}`
  const { isSelecionando, selecionados, alternar } = useSelecaoDaFolha()
  const dataDestino = useDataDoDestino(item.transferidoParaCardId)
  const isPendente = item.status === 'pendente'
  const isConcluido = item.status === 'concluido'
  const isTransferido = item.status === 'transferido'
  const isSelecionavel = isSelecionando && isPendente
  const isSelecionado = isPendente && selecionados.has(item.id)
  const isAtrasado = isPendenteDeAntes(item, data, hoje)
  const isEmAndamento = isPendente && item.emAndamento === true
  const isPrioritario = isPendente && item.prioridade === true

  function handleSalvarTitulo(titulo: string) {
    setIsEditando(false)
    if (titulo !== item.titulo) void renomearItem(item.id, titulo)
  }

  function handleAdicionarSubetapa() {
    setIsSubetapasAbertas(true)
    setIsFocandoNovaSubetapa(true)
  }

  function handleAlternarSubetapas() {
    setIsSubetapasAbertas((atual) => !atual)
    setIsFocandoNovaSubetapa(false)
  }

  const duploClique = useDuploCliqueParaEditar(
    () => setIsEditando(true),
    !isEditando && !isSelecionavel && !isTransferido,
  )

  if (variant === 'card') {
    return (
      <div
        className={cn(
          'group/linha relative flex h-full flex-col justify-between overflow-hidden rounded-md border border-pauta bg-papel/90 dark:bg-card/75 p-2.5 shadow-none transition-colors motion-reduce:transition-none hover:border-caneta/45',
          isSelecionado && 'bg-accent border-caneta/50',
          isConcluido && 'opacity-60 bg-papel/40 dark:bg-card/30',
        )}
      >
        {isEmAndamento && <FileteDeAndamento />}

        {/* Topo do cartão: checkbox, título e menu */}
        <div className="flex items-start gap-2">
          <div data-sem-arrasto="" className="mt-0.5 shrink-0">
            {isTransferido ? (
              <CornerDownRight aria-hidden className="size-4 text-grafite" />
            ) : isSelecionavel ? (
              <Checkbox
                checked={isSelecionado}
                onCheckedChange={() => alternar(item.id)}
                aria-label={`Selecionar ${item.titulo}`}
                className="size-4 rounded-full border-2 border-caneta data-[state=checked]:bg-caneta"
              />
            ) : (
              <Checkbox
                checked={isConcluido}
                onCheckedChange={(marcada) => void definirConclusaoItem(item.id, marcada === true)}
                aria-label={isConcluido ? `Desmarcar ${item.titulo}` : `Concluir ${item.titulo}`}
                className="size-4 rounded-[4px] border-[1.5px] border-tinta/45 bg-papel data-[state=checked]:border-caneta data-[state=checked]:bg-caneta"
              />
            )}
          </div>

          <div
            data-em-andamento={isEmAndamento || undefined}
            data-prioridade={isPrioritario || undefined}
            data-selecionada={isSelecionado || undefined}
            {...alvoDePrioridade('item', item.id, isPendente)}
            {...duploClique}
            data-sem-arrasto={isEditando ? '' : undefined}
            className="min-w-0 flex-1 leading-snug"
          >
            <ComBandeira isPrioritario={isPrioritario && !isEditando}>
              {isTransferido ? (
                <span className="min-w-0 text-[0.8125rem] leading-snug break-words text-grafite">
                  <TextoComLinks texto={item.titulo} />
                </span>
              ) : (
                <TituloEditavel
                  isComLinks
                  titulo={item.titulo}
                  isEditando={isEditando}
                  onIniciarEdicao={() => setIsEditando(true)}
                  onSalvar={handleSalvarTitulo}
                  onCancelar={() => setIsEditando(false)}
                  className={cn(
                    'text-[0.8125rem] font-medium leading-snug break-words',
                    isConcluido && 'text-grafite line-through decoration-tinta/50',
                  )}
                />
              )}
            </ComBandeira>
          </div>

          {!isSelecionavel && (
            <div data-sem-arrasto="" className="shrink-0">
              <MenuItemGrupo
                item={item}
                data={data}
                hoje={hoje}
                onRenomear={() => setIsEditando(true)}
                onAdicionarSubetapa={handleAdicionarSubetapa}
                onDefinirHorario={() => setIsHorarioAberto(true)}
                onNotificar={() => setIsAvisosAberto(true)}
              />
            </div>
          )}
        </div>

        {/* Rodapé do cartão: indicadores e badges */}
        <div data-sem-arrasto="" className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-grafite">
          {isEmAndamento && !isEditando && <IndicadorAndamento desde={item.emAndamentoDesde} isCompacto />}
          {!isEditando && !isTransferido && (
            <HorarioDaTarefa
              alvo={{ tipo: 'item', id: item.id }}
              horario={item.horario}
              titulo={item.titulo}
              isAberto={isHorarioAberto}
              onMudarAberto={setIsHorarioAberto}
              isCompacto
            />
          )}
          {!isEditando && !isTransferido && (
            <AvisosDaTarefa
              alvo={{ tipo: 'item', id: item.id }}
              data={data}
              horario={item.horario}
              titulo={item.titulo}
              isAberto={isAvisosAberto}
              onMudarAberto={setIsAvisosAberto}
              isCompacto
            />
          )}
          {!isEditando && <IndicadorNotas vinculo={vinculoDoItem(item)} titulo={item.titulo} />}
          {isAtrasado && !isEditando && (
            <span className="text-[0.6875rem] font-medium whitespace-nowrap text-alerta">
              desde {diaCurto(item.dataOriginal)}
            </span>
          )}
          {isTransferido &&
            (dataDestino ? (
              <Link
                to={`/dia/${dataDestino}`}
                className="rounded-sm text-xs whitespace-nowrap text-violeta-profundo underline decoration-violeta-profundo/30 underline-offset-2 hover:text-caneta hover:decoration-caneta focus-visible:outline-2 focus-visible:outline-caneta"
              >
                para {diaCurto(dataDestino)}
              </Link>
            ) : (
              <span className="text-xs whitespace-nowrap text-grafite">transferido</span>
            ))}
          {progresso && !isEditando && (
            <BotaoProgresso
              progresso={progresso}
              tituloTarefa={item.titulo}
              isAberto={isSubetapasAbertas}
              idPainel={idPainel}
              onAlternar={handleAlternarSubetapas}
              isCompacto
            />
          )}
        </div>

        {/* Subetapas expandidas no próprio cartão */}
        {isSubetapasAbertas && (
          <div id={idPainel} data-no-drag="" data-sem-arrasto="" className="mt-2 border-t border-pauta/60 pt-2">
            <ListaSubtarefas
              dono={item}
              subtarefas={subetapas}
              isFocandoNovaSubtarefa={isFocandoNovaSubetapa}
              onFechar={() => setIsSubetapasAbertas(false)}
            />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="border-b border-pauta">
      <div
        data-em-andamento={isEmAndamento || undefined}
        data-prioridade={isPrioritario || undefined}
        data-selecionada={isSelecionado || undefined}
        {...alvoDePrioridade('item', item.id, isPendente)}
        {...duploClique}
        className={cn(
          'group/linha relative flex min-h-11 items-center gap-2 pr-2 pl-1',
          isSelecionado && 'bg-accent',
        )}
      >
        {isEmAndamento && <FileteDeAndamento />}
        <span className="flex w-5 shrink-0 justify-center">{!isSelecionavel && alca}</span>
        {isTransferido ? (
          <CornerDownRight aria-hidden className="size-5 shrink-0 text-grafite" />
        ) : isSelecionavel ? (
          <Checkbox
            checked={isSelecionado}
            onCheckedChange={() => alternar(item.id)}
            aria-label={`Selecionar ${item.titulo}`}
            className="size-5 rounded-full border-2 border-caneta data-[state=checked]:bg-caneta"
          />
        ) : (
          <Checkbox
            checked={isConcluido}
            onCheckedChange={(marcada) => void definirConclusaoItem(item.id, marcada === true)}
            aria-label={isConcluido ? `Desmarcar ${item.titulo}` : `Concluir ${item.titulo}`}
            className="size-5 rounded-[4px] border-[1.5px] border-tinta/45 bg-papel data-[state=checked]:border-caneta data-[state=checked]:bg-caneta"
          />
        )}
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 py-1.5 pl-1">
          <ComBandeira isPrioritario={isPrioritario && !isEditando}>
            {isTransferido ? (
              <span className="min-w-0 break-words text-grafite">
                <TextoComLinks texto={item.titulo} />
              </span>
            ) : (
              <TituloEditavel
                isComLinks
                titulo={item.titulo}
                isEditando={isEditando}
                onIniciarEdicao={() => setIsEditando(true)}
                onSalvar={handleSalvarTitulo}
                onCancelar={() => setIsEditando(false)}
                className={cn(isConcluido && 'text-grafite line-through decoration-tinta/50')}
              />
            )}
          </ComBandeira>
          {isEmAndamento && !isEditando && <IndicadorAndamento desde={item.emAndamentoDesde} />}
          {!isEditando && !isTransferido && (
            <HorarioDaTarefa
              alvo={{ tipo: 'item', id: item.id }}
              horario={item.horario}
              titulo={item.titulo}
              isAberto={isHorarioAberto}
              onMudarAberto={setIsHorarioAberto}
            />
          )}
          {!isEditando && !isTransferido && (
            <AvisosDaTarefa
              alvo={{ tipo: 'item', id: item.id }}
              data={data}
              horario={item.horario}
              titulo={item.titulo}
              isAberto={isAvisosAberto}
              onMudarAberto={setIsAvisosAberto}
            />
          )}
          {!isEditando && <IndicadorNotas vinculo={vinculoDoItem(item)} titulo={item.titulo} />}
          {isAtrasado && !isEditando && (
            <span className={SELO_DE_ATRASO}>pendente desde {diaCurto(item.dataOriginal)}</span>
          )}
          {isTransferido &&
            (dataDestino ? (
              <Link
                to={`/dia/${dataDestino}`}
                className="rounded-sm text-sm whitespace-nowrap text-violeta-profundo underline decoration-violeta-profundo/30 underline-offset-2 hover:text-caneta hover:decoration-caneta focus-visible:outline-2 focus-visible:outline-caneta"
              >
                transferido para {diaCurto(dataDestino)}
              </Link>
            ) : (
              <span className="text-sm whitespace-nowrap text-grafite">transferido</span>
            ))}
          {progresso && !isEditando && (
            <BotaoProgresso
              progresso={progresso}
              tituloTarefa={item.titulo}
              isAberto={isSubetapasAbertas}
              idPainel={idPainel}
              onAlternar={handleAlternarSubetapas}
            />
          )}
        </div>
        {!isSelecionavel && (
          <MenuItemGrupo
            item={item}
            data={data}
            hoje={hoje}
            onRenomear={() => setIsEditando(true)}
            onAdicionarSubetapa={handleAdicionarSubetapa}
            onDefinirHorario={() => setIsHorarioAberto(true)}
            onNotificar={() => setIsAvisosAberto(true)}
          />
        )}
      </div>
      {isSubetapasAbertas && (
        <div id={idPainel} className="pb-2 pl-[3.25rem]">
          <ListaSubtarefas
            dono={item}
            subtarefas={subetapas}
            isFocandoNovaSubtarefa={isFocandoNovaSubetapa}
            onFechar={() => setIsSubetapasAbertas(false)}
          />
        </div>
      )}
    </div>
  )
}
