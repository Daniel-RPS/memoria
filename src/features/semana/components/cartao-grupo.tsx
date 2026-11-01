import type { DraggableAttributes, DraggableSyntheticListeners } from '@dnd-kit/core'
import { useDndContext } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useState, type ReactNode } from 'react'
import { CornerDownRight, GripVertical } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from 'cn'
import { CampoNovoItem } from '@/components/campo-novo-item'
import { TituloEditavel } from '@/components/titulo-editavel'
import { Checkbox } from '@/components/ui/checkbox'
import type { DataLocal, GroupItem } from '@/db/types'
import { useCategoriasDoContexto } from '@/hooks/contexto-categorias'
import { classificarTarefa } from '@/lib/categorias'
import { ErroDeValidacao } from '@/lib/erros'
import {
  diaCurto,
  isPendenteDeAntes,
  isGrupoEncerrado,
  podeCopiarGrupo,
  progressoDoGrupo,
  textoProgressoGrupo,
  type GrupoDoDia,
} from '@/lib/grupos'
import { MenuGrupo } from '@/features/dia/components/menu-grupo'
import { MenuItemGrupo } from '@/features/dia/components/menu-item-grupo'
import { useAcoesGrupo } from '@/features/dia/hooks/use-acoes-grupo'
import { useCorNaTela } from '@/hooks/use-cor-na-tela'

interface CartaoGrupoProps {
  grupo: GrupoDoDia
  hoje: DataLocal
  /** Arrastar o card inteiro (ausente na cópia que acompanha o ponteiro). */
  arrasto?: {
    /** O cabeçalho: recebe o foco e o espaço do teclado. */
    ativador: (elemento: HTMLElement | null) => void
    attributes: DraggableAttributes
    listeners: DraggableSyntheticListeners
  }
  isSobreposto?: boolean
}

/** Prefixo do id da lista de itens de um card (área de reordenar). */
export const PREFIXO_ITENS = 'itens:'

/** Dados de arrasto de um item: o dia (para levar) e o card (para reordenar). */
export interface DadosArrastoItem {
  data: DataLocal
  cardId: string
}

/** Áreas marcadas com `data-sem-arrasto` (itens, botões): apertar ali NÃO arrasta o card. */
function isForaDoArrasto(alvo: EventTarget) {
  return alvo instanceof Element && alvo.closest('[data-sem-arrasto]') !== null
}

/**
 * Card compacto da semana, com as mesmas ações do card do dia (menu ⋯, renomear, itens).
 * Arrastar o card (cabeçalho ou qualquer área fora dos itens) leva TODOS os pendentes para
 * outro dia; a alça ⋮⋮ de um item reordena no card ou leva só aquele item a outro dia.
 */
export function CartaoGrupo({ grupo, hoje, arrasto, isSobreposto }: CartaoGrupoProps) {
  const { serie, card } = grupo
  const { renomearGrupo, criarItem } = useAcoesGrupo()
  const [isEditando, setIsEditando] = useState(false)
  const classificacao = classificarTarefa(serie, useCategoriasDoContexto())
  const corNaTela = useCorNaTela()
  const progresso = progressoDoGrupo(grupo)
  const isEncerrado = isGrupoEncerrado(grupo)
  const isArrastavel = podeCopiarGrupo(grupo) && arrasto !== undefined && !isEditando
  const textoProgresso = grupo.itens.length > 0 ? textoProgressoGrupo(progresso) : ''
  const pendentes = grupo.itens.filter((item) => item.status === 'pendente')
  const isItensOrdenaveis = !isSobreposto && arrasto !== undefined

  async function handleSalvarTitulo(titulo: string) {
    setIsEditando(false)
    if (titulo === serie.titulo) return
    try {
      await renomearGrupo(serie.id, titulo)
    } catch (erro) {
      toast.error(erro instanceof ErroDeValidacao ? erro.message : 'Não foi possível renomear.')
    }
  }

  return (
    <div
      {...(isArrastavel ? arrasto.listeners : undefined)}
      onPointerDown={(evento) => {
        // Um item só sai pela alça dele (que já capturou o gesto antes de chegar aqui).
        if (isArrastavel && !isForaDoArrasto(evento.target)) {
          arrasto.listeners?.onPointerDown?.(evento)
        }
      }}
      className={cn(
        'relative my-1.5 rounded-md border border-pauta bg-papel text-[0.9375rem]',
        !isEncerrado && 'shadow-[3px_3px_0_var(--marca-texto)]',
        isArrastavel && 'cursor-grab touch-none active:cursor-grabbing',
        isSobreposto && 'rotate-1 cursor-grabbing shadow-lg ring-2 ring-caneta/40',
      )}
    >
      {/* Borda de cima da ficha, na cor da categoria. */}
      <span
        aria-hidden
        className={cn(
          'absolute -inset-x-px -top-px h-[3px] rounded-t-md',
          isEncerrado && 'opacity-40',
        )}
        style={{
          backgroundColor: classificacao ? corNaTela(classificacao.cor) : 'var(--grafite)',
        }}
      />
      <div className="group/cabecalho flex items-start gap-1 border-b border-dashed border-pauta pt-0.5 pr-1 pl-1.5">
        {/* A alça é o ativador do teclado (foco e espaço); o ponteiro arrasta de qualquer lugar. */}
        {isArrastavel ? (
          <span
            ref={isArrastavel ? arrasto.ativador : undefined}
            {...arrasto.attributes}
            aria-roledescription="grupo arrastável"
            aria-label={`Grupo ${serie.titulo}, ${textoProgresso}. Espaço para levar os pendentes a outro dia.`}
            className="mt-2 flex shrink-0 rounded-sm text-grafite/70 focus-visible:outline-2 focus-visible:outline-caneta"
          >
            <GripVertical aria-hidden className="size-4" />
          </span>
        ) : (
          isSobreposto && (
            <GripVertical aria-hidden className="mt-2 size-4 shrink-0 text-grafite/70" />
          )
        )}
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1.5 py-1.5 pl-1">
          <div
            data-sem-arrasto={isEditando ? '' : undefined}
            className="flex min-w-0 flex-1 basis-16"
          >
            {isSobreposto ? (
              <span className="min-w-0 font-extrabold break-words [font-stretch:85%]">
                {serie.titulo}
              </span>
            ) : (
              <TituloEditavel
                titulo={serie.titulo}
                isEditando={isEditando}
                onIniciarEdicao={() => setIsEditando(true)}
                onSalvar={(titulo) => void handleSalvarTitulo(titulo)}
                onCancelar={() => setIsEditando(false)}
                className={cn(
                  'text-[0.9375rem] font-extrabold [font-stretch:85%]',
                  isEncerrado && 'text-grafite',
                )}
              />
            )}
          </div>
          {!isEditando && textoProgresso && (
            <span className="text-xs text-grafite tabular-nums">
              {isEncerrado && !isSobreposto ? `${textoProgresso} · encerrado` : textoProgresso}
            </span>
          )}
        </div>
        {!isSobreposto && (
          <div data-sem-arrasto="" className="cursor-auto pt-0.5">
            <MenuGrupo grupo={grupo} hoje={hoje} onRenomear={() => setIsEditando(true)} />
          </div>
        )}
      </div>
      {(grupo.itens.length > 0 || !isSobreposto) && (
        <div data-sem-arrasto="" className="cursor-auto py-0.5">
          {grupo.itens.length > 0 && (
            <SortableContext
              id={`${PREFIXO_ITENS}${card.id}`}
              items={isItensOrdenaveis ? pendentes.map((item) => item.id) : []}
              strategy={verticalListSortingStrategy}
            >
              <ul aria-label={`Itens de ${serie.titulo}`}>
                {grupo.itens.map((item) =>
                  item.status === 'pendente' && isItensOrdenaveis ? (
                    <ItemArrastavel
                      key={item.id}
                      item={item}
                      data={card.data}
                      cardId={card.id}
                      hoje={hoje}
                    />
                  ) : (
                    <li key={item.id} className="group/linha">
                      <LinhaItem
                        item={item}
                        data={card.data}
                        hoje={hoje}
                        isSobreposto={isSobreposto}
                      />
                    </li>
                  ),
                )}
              </ul>
            </SortableContext>
          )}
          {!isSobreposto && (
            <div className="pl-1">
              <CampoNovoItem
                rotulo="Adicionar item"
                nomeAcessivel={`Adicionar item em ${serie.titulo}`}
                tamanho="compacto"
                onCriar={(titulo) => criarItem(card.id, titulo)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface ItemProps {
  item: GroupItem
  data: DataLocal
  hoje: DataLocal
}

/**
 * Item pendente arrastado só pela alça ⋮⋮: dentro do card reordena; em outro dia vai sozinho.
 * Só vira alvo de soltar quando o arrastado é um item deste mesmo card, para não atrapalhar
 * o arrasto de tarefas e cards.
 */
function ItemArrastavel({ item, data, cardId, hoje }: ItemProps & { cardId: string }) {
  const { active } = useDndContext()
  const dadosAtivos = active?.data.current as Partial<DadosArrastoItem> | undefined
  const isAlvo = dadosAtivos?.cardId === cardId
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.id,
    data: { data, cardId } satisfies DadosArrastoItem,
    disabled: { draggable: false, droppable: !isAlvo },
  })

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn('group/linha', isDragging && 'opacity-30')}
    >
      <LinhaItem
        item={item}
        data={data}
        hoje={hoje}
        alca={
          <span
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            aria-roledescription="item arrastável"
            aria-label={`Arrastar ${item.titulo}. Espaço para mudar a posição ou levar só este item a outro dia.`}
            className="flex size-4 shrink-0 cursor-grab touch-none items-center justify-center rounded-sm text-grafite opacity-0 group-hover/linha:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-caneta active:cursor-grabbing"
          >
            <GripVertical aria-hidden className="size-3.5" />
          </span>
        }
      />
    </li>
  )
}

function LinhaItem({
  item,
  data,
  hoje,
  alca,
  isSobreposto,
}: ItemProps & { alca?: ReactNode; isSobreposto?: boolean }) {
  const { definirConclusaoItem, renomearItem } = useAcoesGrupo()
  const [isEditando, setIsEditando] = useState(false)
  const isConcluido = item.status === 'concluido'
  const isTransferido = item.status === 'transferido'
  const isAtrasado = isPendenteDeAntes(item, data, hoje)
  const isEditavel = !isTransferido && !isSobreposto

  function handleSalvarTitulo(titulo: string) {
    setIsEditando(false)
    if (titulo !== item.titulo) void renomearItem(item.id, titulo)
  }

  return (
    <div className="flex items-start gap-1 py-0.5 pr-0.5 pl-1">
      <span className="mt-1 flex w-4 shrink-0 justify-center">{alca}</span>
      {isTransferido ? (
        <CornerDownRight aria-hidden className="mt-1 size-4 shrink-0 text-grafite" />
      ) : (
        <Checkbox
          checked={isConcluido}
          onCheckedChange={(marcada) => void definirConclusaoItem(item.id, marcada === true)}
          aria-label={isConcluido ? `Desmarcar ${item.titulo}` : `Concluir ${item.titulo}`}
          className="mt-1 size-4 rounded-[3px] border-[1.5px] border-tinta/45 bg-papel data-[state=checked]:border-caneta data-[state=checked]:bg-caneta"
        />
      )}
      <span
        className={cn(
          'min-w-0 flex-1 py-0.5 pl-1 break-words',
          isConcluido && 'text-grafite',
          isTransferido && 'text-grafite',
        )}
      >
        {isEditavel ? (
          <TituloEditavel
            titulo={item.titulo}
            isEditando={isEditando}
            onIniciarEdicao={() => setIsEditando(true)}
            onSalvar={handleSalvarTitulo}
            onCancelar={() => setIsEditando(false)}
            className={cn(
              'text-[0.9375rem]',
              isConcluido && 'text-grafite line-through decoration-tinta/50',
            )}
          />
        ) : (
          item.titulo
        )}
        {isAtrasado && !isEditando && (
          <span className="ml-1.5 rounded-[3px] bg-marca-texto px-1 text-xs font-medium whitespace-nowrap text-violeta-profundo no-underline">
            desde {diaCurto(item.dataOriginal)}
          </span>
        )}
        {isTransferido && <span className="ml-1.5 text-xs whitespace-nowrap">transferido</span>}
      </span>
      {!isSobreposto && (
        <MenuItemGrupo item={item} data={data} hoje={hoje} onRenomear={() => setIsEditando(true)} />
      )}
    </div>
  )
}
