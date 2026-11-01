import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Trash2 } from 'lucide-react'
import { cn } from 'cn'
import { AlcaArrastar } from '@/components/alca-arrastar'
import { CampoNovoItem } from '@/components/campo-novo-item'
import { ListaOrdenavel } from '@/components/lista-ordenavel'
import { SeletorCor } from '@/components/seletor-cor'
import { TituloEditavel } from '@/components/titulo-editavel'
import { Button } from '@/components/ui/button'
import { useAcoesCategoria } from '@/hooks/use-acoes-categoria'
import { textoDoUso, type CategoriaComSubcategorias, type UsoDaCategoria } from '@/lib/categorias'
import { ConfirmarExclusao } from '@/features/categorias/components/confirmar-exclusao'
import { ItemSubcategoria } from '@/features/categorias/components/item-subcategoria'
import { mostrarErroAoSalvar } from '@/features/categorias/mostrar-erro'

interface ItemCategoriaProps {
  categoria: CategoriaComSubcategorias
  uso: UsoDaCategoria
}

/** "4 tarefas · 1 grupo ficam “Sem categoria”…" e o que acontece com as subcategorias. */
function descreverExclusao(categoria: CategoriaComSubcategorias, uso: UsoDaCategoria) {
  const total = uso.tarefas + uso.grupos + uso.procedimentos
  const itens =
    total === 0
      ? 'Nenhum item usa esta categoria.'
      : `${textoDoUso(uso)} ${total === 1 ? 'fica' : 'ficam'} “Sem categoria”; nada é apagado.`
  const quantidade = categoria.subcategorias.length
  if (quantidade === 0) return itens
  if (quantidade === 1) return `${itens} A subcategoria também será excluída.`
  return `${itens} As ${quantidade} subcategorias também serão excluídas.`
}

/**
 * Categoria arrastável pela alça: cor, nome editável, uso e exclusão, com as subcategorias
 * (também reordenáveis) logo abaixo.
 */
export function ItemCategoria({ categoria, uso }: ItemCategoriaProps) {
  const { atualizarCategoria, criarSubcategoria, excluirCategoria, reordenarSubcategoria } =
    useAcoesCategoria()
  const [isEditando, setIsEditando] = useState(false)
  const [isConfirmandoExclusao, setIsConfirmandoExclusao] = useState(false)
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: categoria.id })

  function handleSalvarNome(nome: string) {
    setIsEditando(false)
    if (nome !== categoria.nome) {
      atualizarCategoria(categoria.id, { nome }).catch(mostrarErroAoSalvar)
    }
  }

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        'relative border-b border-pauta bg-papel pb-1 last:border-b-0',
        isDragging && 'z-10 rounded-sm ring-2 ring-caneta/40',
      )}
    >
      <div className="group/linha flex min-h-12 flex-wrap items-center gap-x-3 pr-2 pl-1">
        <AlcaArrastar
          rotulo={`Mover ${categoria.nome}`}
          ref={setActivatorNodeRef}
          attributes={attributes}
          listeners={listeners}
        />
        <SeletorCor
          cor={categoria.cor}
          corEscolhida={categoria.cor}
          nomeItem={categoria.nome}
          onEscolher={(cor) => void atualizarCategoria(categoria.id, { cor })}
        />
        <div className="min-w-0 flex-1 basis-32">
          <TituloEditavel
            titulo={categoria.nome}
            isEditando={isEditando}
            onIniciarEdicao={() => setIsEditando(true)}
            onSalvar={handleSalvarNome}
            onCancelar={() => setIsEditando(false)}
            className="font-semibold"
          />
        </div>
        <span className="text-sm text-grafite tabular-nums">{textoDoUso(uso)}</span>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Excluir ${categoria.nome}`}
          onClick={() => setIsConfirmandoExclusao(true)}
          className="text-grafite opacity-0 group-hover/linha:opacity-100 focus-visible:opacity-100"
        >
          <Trash2 />
        </Button>
      </div>

      <div className="pl-14">
        <ListaOrdenavel
          itens={categoria.subcategorias}
          rotulo={`Subcategorias de ${categoria.nome}`}
          onReordenar={reordenarSubcategoria}
          renderItem={(subcategoria) => (
            <ItemSubcategoria
              key={subcategoria.id}
              categoria={categoria}
              subcategoria={subcategoria}
            />
          )}
        />
        <CampoNovoItem
          rotulo="Nova subcategoria"
          nomeAcessivel={`Nova subcategoria de ${categoria.nome}`}
          tamanho="compacto"
          onCriar={(nome) => criarSubcategoria({ categoryId: categoria.id, nome })}
        />
      </div>

      <ConfirmarExclusao
        titulo={`Excluir “${categoria.nome}”?`}
        descricao={descreverExclusao(categoria, uso)}
        rotuloAcao="Excluir categoria"
        isAberto={isConfirmandoExclusao}
        onMudarAberto={setIsConfirmandoExclusao}
        onConfirmar={() => void excluirCategoria(categoria.id)}
      />
    </li>
  )
}
