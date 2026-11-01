import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { X } from 'lucide-react'
import { cn } from 'cn'
import { AlcaArrastar } from '@/components/alca-arrastar'
import { SeletorCor } from '@/components/seletor-cor'
import { TituloEditavel } from '@/components/titulo-editavel'
import { Button } from '@/components/ui/button'
import type { Subcategory } from '@/db/types'
import { useAcoesCategoria } from '@/hooks/use-acoes-categoria'
import { corDaSubcategoria, type CategoriaComSubcategorias } from '@/lib/categorias'
import { ConfirmarExclusao } from '@/features/categorias/components/confirmar-exclusao'
import { mostrarErroAoSalvar } from '@/features/categorias/mostrar-erro'

interface ItemSubcategoriaProps {
  categoria: CategoriaComSubcategorias
  subcategoria: Subcategory
}

/** Subcategoria arrastável: cor (própria ou tom da categoria), nome editável e exclusão. */
export function ItemSubcategoria({ categoria, subcategoria }: ItemSubcategoriaProps) {
  const { atualizarSubcategoria, excluirSubcategoria } = useAcoesCategoria()
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
  } = useSortable({ id: subcategoria.id })

  function handleSalvarNome(nome: string) {
    setIsEditando(false)
    if (nome !== subcategoria.nome) {
      atualizarSubcategoria(subcategoria.id, { nome }).catch(mostrarErroAoSalvar)
    }
  }

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        'group/linha relative flex min-h-9 items-center gap-3 bg-papel pr-2',
        isDragging && 'z-10 rounded-sm ring-2 ring-caneta/40',
      )}
    >
      <AlcaArrastar
        rotulo={`Mover ${subcategoria.nome}`}
        ref={setActivatorNodeRef}
        attributes={attributes}
        listeners={listeners}
      />
      <SeletorCor
        tamanho="pequeno"
        cor={corDaSubcategoria(categoria, subcategoria.id)}
        corEscolhida={subcategoria.cor}
        nomeItem={subcategoria.nome}
        onEscolher={(cor) => void atualizarSubcategoria(subcategoria.id, { cor })}
        onUsarAutomatica={() => void atualizarSubcategoria(subcategoria.id, { cor: null })}
      />
      <div className="min-w-0 flex-1">
        <TituloEditavel
          titulo={subcategoria.nome}
          isEditando={isEditando}
          onIniciarEdicao={() => setIsEditando(true)}
          onSalvar={handleSalvarNome}
          onCancelar={() => setIsEditando(false)}
          className="text-[0.9375rem]"
        />
      </div>
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label={`Excluir ${subcategoria.nome}`}
        onClick={() => setIsConfirmandoExclusao(true)}
        className="text-grafite opacity-0 group-hover/linha:opacity-100 focus-visible:opacity-100"
      >
        <X />
      </Button>
      <ConfirmarExclusao
        titulo={`Excluir “${subcategoria.nome}”?`}
        descricao={`Tarefas, grupos e procedimentos com “${subcategoria.nome}” continuam em “${categoria.nome}”, só sem a subcategoria. Nada é apagado.`}
        rotuloAcao="Excluir subcategoria"
        isAberto={isConfirmandoExclusao}
        onMudarAberto={setIsConfirmandoExclusao}
        onConfirmar={() => void excluirSubcategoria(subcategoria.id)}
      />
    </li>
  )
}
