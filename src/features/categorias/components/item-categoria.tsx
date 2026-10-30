import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { CampoNovoItem } from '@/components/campo-novo-item'
import { TituloEditavel } from '@/components/titulo-editavel'
import { Button } from '@/components/ui/button'
import type { CategoriaComSubcategorias } from '@/lib/categorias'
import { useAcoesCategoria } from '@/features/categorias/hooks/use-acoes-categoria'
import { ConfirmarExclusaoCategoria } from '@/features/categorias/components/confirmar-exclusao-categoria'
import { ItemSubcategoria } from '@/features/categorias/components/item-subcategoria'
import { SeletorCor } from '@/features/categorias/components/seletor-cor'

interface ItemCategoriaProps {
  categoria: CategoriaComSubcategorias
}

/** Categoria com cor, nome editável, exclusão e as subcategorias logo abaixo. */
export function ItemCategoria({ categoria }: ItemCategoriaProps) {
  const { atualizarCategoria, criarSubcategoria } = useAcoesCategoria()
  const [isEditando, setIsEditando] = useState(false)
  const [isConfirmandoExclusao, setIsConfirmandoExclusao] = useState(false)

  function handleSalvarNome(nome: string) {
    setIsEditando(false)
    if (nome !== categoria.nome) void atualizarCategoria(categoria.id, { nome })
  }

  return (
    <li className="border-b border-pauta pb-1">
      <div className="group/linha flex min-h-12 items-center gap-3 pr-2 pl-4">
        <SeletorCor
          cor={categoria.cor}
          corEscolhida={categoria.cor}
          nomeItem={categoria.nome}
          onEscolher={(cor) => void atualizarCategoria(categoria.id, { cor })}
        />
        <div className="min-w-0 flex-1">
          <TituloEditavel
            titulo={categoria.nome}
            isEditando={isEditando}
            onIniciarEdicao={() => setIsEditando(true)}
            onSalvar={handleSalvarNome}
            onCancelar={() => setIsEditando(false)}
            className="font-semibold"
          />
        </div>
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

      <div className="pl-12">
        {categoria.subcategorias.length > 0 && (
          <ul aria-label={`Subcategorias de ${categoria.nome}`}>
            {categoria.subcategorias.map((subcategoria) => (
              <ItemSubcategoria
                key={subcategoria.id}
                categoria={categoria}
                subcategoria={subcategoria}
              />
            ))}
          </ul>
        )}
        <CampoNovoItem
          rotulo={`Nova subcategoria de ${categoria.nome}`}
          tamanho="compacto"
          onCriar={(nome) => criarSubcategoria({ categoryId: categoria.id, nome })}
        />
      </div>

      <ConfirmarExclusaoCategoria
        categoria={categoria}
        isAberto={isConfirmandoExclusao}
        onMudarAberto={setIsConfirmandoExclusao}
      />
    </li>
  )
}
