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
import { corDaSubcategoria } from '@/lib/categorias'
import { useCategoriasDoContexto } from '@/hooks/contexto-categorias'

export interface CategoriaEscolhida {
  categoryId?: string
  subcategoryId?: string
}

interface SubmenuCategoriaProps {
  /** Categoria atual (da tarefa ou do grupo). */
  atual: CategoriaEscolhida
  onEscolher: (categoria: CategoriaEscolhida) => void
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

/** Escolha da categoria/subcategoria (de tarefa ou grupo) dentro do menu ⋯. */
export function SubmenuCategoria({ atual, onEscolher }: SubmenuCategoriaProps) {
  const categorias = useCategoriasDoContexto()

  function handleEscolher(valor: string) {
    if (valor === SEM_CATEGORIA) {
      onEscolher({})
      return
    }
    const [categoryId, subcategoryId] = valor.split(SEPARADOR)
    onEscolher({ categoryId, subcategoryId })
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
            value={valorDe(atual.categoryId, atual.subcategoryId)}
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
