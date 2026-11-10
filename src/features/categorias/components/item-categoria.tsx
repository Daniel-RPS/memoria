import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ArrowRightLeft, MoreHorizontal, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from 'cn'
import { AlcaArrastar } from '@/components/alca-arrastar'
import { SeletorIcone } from '@/components/icones/seletor-icone'
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
  type UsoDaCategoria,
} from '@/lib/categorias'
import type { Category } from '@/db/types'
import { ConfirmarExclusao } from '@/features/categorias/components/confirmar-exclusao'
import { mostrarErroAoSalvar } from '@/features/categorias/mostrar-erro'

interface ItemCategoriaProps {
  categoria: Category
  /** Só o uso que conta no tipo da categoria (`usoNoTipo`). */
  uso: UsoDaCategoria
}

/** "4 tarefas · 1 grupo ficam “Sem categoria”; nada é apagado." */
function descreverExclusao(uso: UsoDaCategoria) {
  const total = totalDoUso(uso)
  if (total === 0) return 'Nenhum item usa esta categoria.'
  return `${textoDoUso(uso)} ${total === 1 ? 'fica' : 'ficam'} “Sem categoria”; nada é apagado.`
}

/** "2 grupos ficarão “Sem categoria”…" ao trocar de tipo. */
function descreverMudancaDeTipo(categoria: Category, uso: UsoDaCategoria) {
  const total = totalDoUso(uso)
  const destino = NOMES_DO_TIPO[outroTipo(categoria.tipo)].plural
  return `${textoDoUso(uso)} ${total === 1 ? 'ficará' : 'ficarão'} “Sem categoria”: a categoria passa a valer só em ${destino}. Nada é apagado.`
}

/**
 * Categoria arrastável pela alça: cor, ícone (emoji ou marca), nome editável, uso e menu ⋯
 * (mover para o outro tipo, excluir).
 */
export function ItemCategoria({ categoria, uso }: ItemCategoriaProps) {
  const { atualizarCategoria, definirIconeDaCategoria, excluirCategoria, moverCategoriaDeTipo } =
    useAcoesCategoria()
  const [isEditando, setIsEditando] = useState(false)
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
        <SeletorIcone
          icone={categoria.icone}
          rotulo={`Ícone da categoria ${categoria.nome}`}
          onEscolher={(icone) =>
            definirIconeDaCategoria(categoria.id, icone).catch(mostrarErroAoSalvar)
          }
          // Sem ícone, a carinha só aparece ao passar o mouse ou focar a linha.
          className={cn(
            '-mx-1.5',
            !categoria.icone &&
              'opacity-0 group-hover/linha:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100',
          )}
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

      <ConfirmarExclusao
        titulo={`Excluir “${categoria.nome}”?`}
        descricao={descreverExclusao(usoDoTipo)}
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
