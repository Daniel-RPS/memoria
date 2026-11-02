import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ArrowRightLeft, MoreHorizontal, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from 'cn'
import { AlcaArrastar } from '@/components/alca-arrastar'
import { CampoNovoItem } from '@/components/campo-novo-item'
import { ListaOrdenavel } from '@/components/lista-ordenavel'
import { SeletorCor } from '@/components/seletor-cor'
import { TituloEditavel } from '@/components/titulo-editavel'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAcoesCategoria } from '@/hooks/use-acoes-categoria'
import {
  NOMES_DO_TIPO,
  outroTipo,
  textoDoUso,
  totalDoUso,
  usoNoTipo,
  type CategoriaComSubcategorias,
  type UsoDaCategoria,
} from '@/lib/categorias'
import { ConfirmarExclusao } from '@/features/categorias/components/confirmar-exclusao'
import { ItemSubcategoria } from '@/features/categorias/components/item-subcategoria'
import { mostrarErroAoSalvar } from '@/features/categorias/mostrar-erro'

interface ItemCategoriaProps {
  categoria: CategoriaComSubcategorias
  /** Só o uso que conta no tipo da categoria (`usoNoTipo`). */
  uso: UsoDaCategoria
}

/** "4 tarefas · 1 grupo ficam “Sem categoria”…" e o que acontece com as subcategorias. */
function descreverExclusao(categoria: CategoriaComSubcategorias, uso: UsoDaCategoria) {
  const total = totalDoUso(uso)
  const itens =
    total === 0
      ? 'Nenhum item usa esta categoria.'
      : `${textoDoUso(uso)} ${total === 1 ? 'fica' : 'ficam'} “Sem categoria”; nada é apagado.`
  const quantidade = categoria.subcategorias.length
  if (quantidade === 0) return itens
  if (quantidade === 1) return `${itens} A subcategoria também será excluída.`
  return `${itens} As ${quantidade} subcategorias também serão excluídas.`
}

/** "2 grupos ficarão “Sem categoria”…" ao trocar de tipo. */
function descreverMudancaDeTipo(categoria: CategoriaComSubcategorias, uso: UsoDaCategoria) {
  const total = totalDoUso(uso)
  const destino = NOMES_DO_TIPO[outroTipo(categoria.tipo)].plural
  return `${textoDoUso(uso)} ${total === 1 ? 'ficará' : 'ficarão'} “Sem categoria”: a categoria passa a valer só em ${destino}. Nada é apagado.`
}

/**
 * Categoria arrastável pela alça: cor, nome editável, "+" de subcategoria, uso e menu ⋯
 * (mover para o outro tipo, excluir), com as subcategorias (também reordenáveis) abaixo.
 */
export function ItemCategoria({ categoria, uso }: ItemCategoriaProps) {
  const {
    atualizarCategoria,
    criarSubcategoria,
    excluirCategoria,
    moverCategoriaDeTipo,
    reordenarSubcategoria,
  } = useAcoesCategoria()
  const [isEditando, setIsEditando] = useState(false)
  const [isCriandoSubcategoria, setIsCriandoSubcategoria] = useState(false)
  const [isConfirmandoExclusao, setIsConfirmandoExclusao] = useState(false)
  const [isConfirmandoMudanca, setIsConfirmandoMudanca] = useState(false)
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: categoria.id })
  const destino = NOMES_DO_TIPO[outroTipo(categoria.tipo)].plural
  const usoDoTipo = usoNoTipo(uso, categoria.tipo)

  function handleSalvarNome(nome: string) {
    setIsEditando(false)
    if (nome !== categoria.nome) {
      atualizarCategoria(categoria.id, { nome }).catch(mostrarErroAoSalvar)
    }
  }

  function handleMover() {
    moverCategoriaDeTipo(categoria.id)
      .then(() => toast.success(`“${categoria.nome}” agora está em ${destino}.`))
      .catch(mostrarErroAoSalvar)
  }

  function handlePedirMudanca() {
    // Sem itens usando, não há o que avisar: move direto.
    if (totalDoUso(usoDoTipo) === 0) handleMover()
    else setIsConfirmandoMudanca(true)
  }

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        'relative border-b border-pauta bg-papel last:border-b-0',
        isDragging && 'z-10 rounded-sm ring-2 ring-caneta/40',
      )}
    >
      <div className="group/linha flex min-h-11 flex-wrap items-center gap-x-2.5 pr-1.5 pl-1">
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
        {/* Base mínima: na tela estreita, uso e ⋯ descem de linha em vez de esmagar o nome. */}
        <div className="flex min-w-0 flex-1 basis-24 items-center gap-1">
          <TituloEditavel
            titulo={categoria.nome}
            isEditando={isEditando}
            onIniciarEdicao={() => setIsEditando(true)}
            onSalvar={handleSalvarNome}
            onCancelar={() => setIsEditando(false)}
            className="font-semibold"
          />
          {!isEditando && (
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={`Nova subcategoria em ${categoria.nome}`}
              title="Nova subcategoria"
              aria-expanded={isCriandoSubcategoria}
              onClick={() => setIsCriandoSubcategoria(true)}
              className="shrink-0 text-grafite hover:text-violeta-profundo"
            >
              <Plus />
            </Button>
          )}
        </div>
        <span className="shrink-0 text-sm text-grafite tabular-nums">{textoDoUso(usoDoTipo)}</span>
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Mais ações para ${categoria.nome}`}
              className="shrink-0 text-grafite"
            >
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={handlePedirMudanca}>
              <ArrowRightLeft /> Mover para {destino}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => setIsConfirmandoExclusao(true)}>
              <Trash2 /> Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {(categoria.subcategorias.length > 0 || isCriandoSubcategoria) && (
        <div className="pb-1.5 pl-14">
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
          {isCriandoSubcategoria && (
            <CampoNovoItem
              autoFocus
              rotulo="Nova subcategoria"
              nomeAcessivel={`Nova subcategoria de ${categoria.nome}`}
              tamanho="compacto"
              onCriar={(nome) => criarSubcategoria({ categoryId: categoria.id, nome })}
              onSairVazio={() => setIsCriandoSubcategoria(false)}
            />
          )}
        </div>
      )}

      <ConfirmarExclusao
        titulo={`Excluir “${categoria.nome}”?`}
        descricao={descreverExclusao(categoria, usoDoTipo)}
        rotuloAcao="Excluir categoria"
        isAberto={isConfirmandoExclusao}
        onMudarAberto={setIsConfirmandoExclusao}
        onConfirmar={() => void excluirCategoria(categoria.id)}
      />
      <ConfirmarExclusao
        titulo={`Mover “${categoria.nome}” para ${destino}?`}
        descricao={descreverMudancaDeTipo(categoria, usoDoTipo)}
        rotuloAcao={`Mover para ${destino}`}
        isNeutra
        isAberto={isConfirmandoMudanca}
        onMudarAberto={setIsConfirmandoMudanca}
        onConfirmar={handleMover}
      />
    </li>
  )
}
