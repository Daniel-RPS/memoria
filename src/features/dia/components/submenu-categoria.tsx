import { Tag } from 'lucide-react'
import { Link } from 'react-router'
import {
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu'
import type { Task } from '@/db/types'
import { corDaSubcategoria } from '@/lib/categorias'
import { useAcoesTarefa } from '@/features/dia/hooks/use-acoes-tarefa'
import { useCategoriasDoContexto } from '@/hooks/contexto-categorias'

interface SubmenuCategoriaProps {
  tarefa: Task
}

const SEM_CATEGORIA = 'sem-categoria'
const SEPARADOR = '/'

function valorDe(categoryId?: string, subcategoryId?: string) {
  if (!categoryId) return SEM_CATEGORIA
  return subcategoryId ? `${categoryId}${SEPARADOR}${subcategoryId}` : categoryId
}

function Amostra({ cor }: { cor: string }) {
  return <span aria-hidden className="size-2.5 rounded-full" style={{ backgroundColor: cor }} />
}

/** Escolha da categoria/subcategoria da tarefa dentro do menu ⋯. */
export function SubmenuCategoria({ tarefa }: SubmenuCategoriaProps) {
  const categorias = useCategoriasDoContexto()
  const { definirCategoria } = useAcoesTarefa()

  function handleEscolher(valor: string) {
    if (valor === SEM_CATEGORIA) {
      void definirCategoria(tarefa.id, {})
      return
    }
    const [categoryId, subcategoryId] = valor.split(SEPARADOR)
    void definirCategoria(tarefa.id, { categoryId, subcategoryId })
  }

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <Tag /> Categoria
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="max-h-80 overflow-y-auto">
        {categorias.length === 0 ? (
          <DropdownMenuItem asChild>
            <Link to="/categorias">Criar categorias</Link>
          </DropdownMenuItem>
        ) : (
          <DropdownMenuRadioGroup
            value={valorDe(tarefa.categoryId, tarefa.subcategoryId)}
            onValueChange={handleEscolher}
          >
            <DropdownMenuRadioItem value={SEM_CATEGORIA}>Sem categoria</DropdownMenuRadioItem>
            <DropdownMenuSeparator />
            {categorias.map((categoria) => [
              <DropdownMenuRadioItem key={categoria.id} value={categoria.id}>
                <Amostra cor={categoria.cor} /> {categoria.nome}
              </DropdownMenuRadioItem>,
              ...categoria.subcategorias.map((subcategoria) => (
                <DropdownMenuRadioItem
                  key={subcategoria.id}
                  value={valorDe(categoria.id, subcategoria.id)}
                  className="pl-6"
                >
                  <Amostra cor={corDaSubcategoria(categoria, subcategoria.id)} />{' '}
                  {subcategoria.nome}
                </DropdownMenuRadioItem>
              )),
            ])}
          </DropdownMenuRadioGroup>
        )}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  )
}
