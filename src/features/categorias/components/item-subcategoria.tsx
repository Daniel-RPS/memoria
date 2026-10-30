import { useState } from 'react'
import { X } from 'lucide-react'
import { TituloEditavel } from '@/components/titulo-editavel'
import { Button } from '@/components/ui/button'
import type { Subcategory } from '@/db/types'
import { corDaSubcategoria, type CategoriaComSubcategorias } from '@/lib/categorias'
import { useAcoesCategoria } from '@/features/categorias/hooks/use-acoes-categoria'
import { SeletorCor } from '@/features/categorias/components/seletor-cor'

interface ItemSubcategoriaProps {
  categoria: CategoriaComSubcategorias
  subcategoria: Subcategory
}

/** Subcategoria: cor (própria ou tom da categoria), nome editável e exclusão. */
export function ItemSubcategoria({ categoria, subcategoria }: ItemSubcategoriaProps) {
  const { atualizarSubcategoria, excluirSubcategoria } = useAcoesCategoria()
  const [isEditando, setIsEditando] = useState(false)

  function handleSalvarNome(nome: string) {
    setIsEditando(false)
    if (nome !== subcategoria.nome) void atualizarSubcategoria(subcategoria.id, { nome })
  }

  return (
    <li className="group/linha flex min-h-9 items-center gap-3 pr-2">
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
        onClick={() => void excluirSubcategoria(subcategoria.id)}
        className="text-grafite opacity-0 group-hover/linha:opacity-100 focus-visible:opacity-100"
      >
        <X />
      </Button>
    </li>
  )
}
