import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { Plus } from 'lucide-react'
import { Link } from 'react-router'
import { IconeDaEntidade } from '@/components/icones/icone-da-entidade'
import { instrucoesLeitorDeTela } from '@/components/lista-ordenavel'
import { AcoesDasSecoes, SecaoRecolhivel } from '@/components/secao-recolhivel'
import type { BlocoDeProcedimentos } from '@/lib/procedimentos'
import { useAcoesCategoria } from '@/hooks/use-acoes-categoria'
import { useCorDeTraco, useCorNaTela } from '@/hooks/use-cor-na-tela'
import { useSecoesRecolhidas } from '@/hooks/use-secoes-recolhidas'
import { BlocoOrdenavel } from '@/features/procedimentos/components/bloco-procedimentos'
import { GradeProcedimentos } from '@/features/procedimentos/components/grade-procedimentos'
import { useOrdemOtimista } from '@/features/procedimentos/hooks/use-ordem-otimista'
import type { EstadoNovoProcedimento } from '@/features/procedimentos/novo-procedimento-page'

interface ListaProcedimentosProps {
  blocos: BlocoDeProcedimentos[]
  /**
   * Busca ou filtro ativo: os blocos abrem sozinhos, sem mudar o estado salvo, e o arrasto e
   * as setas de ordem somem (a ordem salva continua valendo).
   */
  isFiltrando: boolean
}

const SEM_CATEGORIA = 'sem-categoria'
const idDoBloco = ({ categoria }: BlocoDeProcedimentos) => categoria?.id ?? SEM_CATEGORIA

/** Distância mínima do ponteiro antes de começar a arrastar, para não roubar o clique. */
const DISTANCIA_PARA_ARRASTAR = 4

/**
 * Um bloco recolhível por categoria (com a cor dela), vazio inclusive, e "Sem categoria" no
 * fim; cartões em grade. Sem filtro, as categorias arrastam (a mesma ordem da aba Categorias)
 * e os cartões arrastam dentro da categoria.
 */
export function ListaProcedimentos({ blocos, isFiltrando }: ListaProcedimentosProps) {
  const corNaTela = useCorNaTela()
  const corDeTraco = useCorDeTraco()
  const secoes = useSecoesRecolhidas('procedimentos', isFiltrando)
  const { reordenarCategoria } = useAcoesCategoria()
  const ids = blocos.map(idDoBloco)
  const porId = new Map(blocos.map((bloco) => [idDoBloco(bloco), bloco]))
  const ordemDasCategorias = useOrdemOtimista(ids.filter((id) => id !== SEM_CATEGORIA))
  const semCategoria = porId.get(SEM_CATEGORIA)
  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: DISTANCIA_PARA_ARRASTAR } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return
    const atuais = ordemDasCategorias.ids
    const nova = arrayMove(
      atuais,
      atuais.indexOf(String(active.id)),
      atuais.indexOf(String(over.id)),
    )
    ordemDasCategorias.definir(nova)
    void reordenarCategoria(nova, String(active.id))
  }

  function renderBloco(bloco: BlocoDeProcedimentos) {
    const { categoria, procedimentos } = bloco
    const id = idDoBloco(bloco)
    const corDaFaixa = categoria ? corDeTraco(categoria.cor) : 'var(--grafite)'
    return (
      <SecaoRecolhivel
        titulo={categoria?.nome ?? 'Sem categoria'}
        cor={categoria ? corNaTela(categoria.cor) : null}
        icone={categoria?.icone && <IconeDaEntidade icone={categoria.icone} tamanho="lg" />}
        contagem={procedimentos.length}
        isAberta={secoes.isAberta(id)}
        onAlternar={() => secoes.handleAlternar(id)}
      >
        {procedimentos.length === 0 && categoria ? (
          <BlocoVazio categoryId={categoria.id} nome={categoria.nome} />
        ) : (
          <GradeProcedimentos
            procedimentos={procedimentos}
            cor={corDaFaixa}
            isOrdenavel={!isFiltrando}
          />
        )}
      </SecaoRecolhivel>
    )
  }

  if (blocos.length === 0) return null
  const isCategoriasOrdenaveis = !isFiltrando && ordemDasCategorias.ids.length > 1
  return (
    <div className="flex flex-col gap-6">
      <AcoesDasSecoes
        isTudoAberto={ids.every(secoes.isAberta)}
        isTudoRecolhido={!ids.some(secoes.isAberta)}
        onExpandirTudo={() => secoes.handleExpandirTudo(ids)}
        onRecolherTudo={() => secoes.handleRecolherTudo(ids)}
      />
      <DndContext
        sensors={sensores}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        accessibility={{ screenReaderInstructions: instrucoesLeitorDeTela }}
      >
        <SortableContext items={ordemDasCategorias.ids} strategy={verticalListSortingStrategy}>
          {ordemDasCategorias.ids.map((id) => {
            const bloco = porId.get(id)
            if (!bloco) return null
            return (
              <BlocoOrdenavel
                key={id}
                id={id}
                nome={bloco.categoria?.nome ?? ''}
                isOrdenavel={isCategoriasOrdenaveis}
              >
                {renderBloco(bloco)}
              </BlocoOrdenavel>
            )
          })}
        </SortableContext>
      </DndContext>
      {semCategoria && renderBloco(semCategoria)}
    </div>
  )
}

/** Categoria sem procedimento: uma linha discreta e o atalho que já abre o editor nela. */
function BlocoVazio({ categoryId, nome }: { categoryId: string; nome: string }) {
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-dashed border-pauta px-3 py-2.5 text-sm text-grafite">
      Nenhum procedimento nesta categoria
      <Link
        to="/procedimentos/novo"
        state={{ categoryId } satisfies EstadoNovoProcedimento}
        aria-label={`Novo procedimento em ${nome}`}
        className="flex items-center gap-1 rounded-sm font-medium text-violeta-profundo underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-caneta"
      >
        <Plus aria-hidden className="size-3.5" /> Novo procedimento aqui
      </Link>
    </p>
  )
}
