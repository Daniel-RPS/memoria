import { useState } from 'react'
import { ArrowLeft, Plus } from 'lucide-react'
import {
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { FormularioNovaCategoria } from '@/components/seletor-categoria/formulario-nova-categoria'
import { useAcoesCategoria } from '@/hooks/use-acoes-categoria'
import { useCategorias } from '@/hooks/use-categorias'
import { corDaSubcategoria, type CategoriaComSubcategorias } from '@/lib/categorias'
import { proximaCor } from '@/lib/cores'

export interface CategoriaEscolhida {
  categoryId?: string
  subcategoryId?: string
}

export interface SeletorCategoriaProps {
  /** Categoria atual do item (tarefa, grupo ou procedimento). */
  atual: CategoriaEscolhida
  onEscolher: (categoria: CategoriaEscolhida) => void
  /** Fecha o menu depois de criar (escolher uma opção já fecha sozinho). */
  onFechar: () => void
}

type Criando =
  { tipo: 'categoria' } | { tipo: 'subcategoria'; categoria: CategoriaComSubcategorias }

const SEM_CATEGORIA = 'sem-categoria'
const SEPARADOR = '/'

function valorDe({ categoryId, subcategoryId }: CategoriaEscolhida) {
  if (!categoryId) return SEM_CATEGORIA
  return subcategoryId ? `${categoryId}${SEPARADOR}${subcategoryId}` : categoryId
}

function Amostra({ cor }: { cor: string }) {
  return (
    <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: cor }} />
  )
}

/**
 * Opções de categoria para dentro de um menu (`DropdownMenuContent` ou `SubContent`):
 * "Sem categoria", categorias e subcategorias na ordem do usuário, e criar ali mesmo.
 * O que for criado já fica aplicado ao item e o menu fecha.
 */
export function SeletorCategoria({ atual, onEscolher, onFechar }: SeletorCategoriaProps) {
  const { categorias } = useCategorias()
  const { criarCategoria, criarSubcategoria } = useAcoesCategoria()
  const [criando, setCriando] = useState<Criando | null>(null)

  function handleEscolher(valor: string) {
    if (valor === SEM_CATEGORIA) {
      onEscolher({})
      return
    }
    const [categoryId, subcategoryId] = valor.split(SEPARADOR)
    onEscolher({ categoryId, subcategoryId })
  }

  // Criando: só o formulário, para nada no menu roubar o foco do campo.
  if (criando) {
    const isSubcategoria = criando.tipo === 'subcategoria'
    return (
      <div className="flex w-64 max-w-[calc(100vw-2rem)] flex-col gap-1 p-1">
        <button
          type="button"
          onClick={() => setCriando(null)}
          className="flex w-fit items-center gap-1 rounded-sm px-1 text-sm text-grafite hover:text-tinta focus-visible:outline-2 focus-visible:outline-caneta"
        >
          <ArrowLeft aria-hidden className="size-3.5" />
          {isSubcategoria ? `Subcategoria em ${criando.categoria.nome}` : 'Categorias'}
        </button>
        <FormularioNovaCategoria
          autoFocus
          rotulo={isSubcategoria ? 'Nova subcategoria' : 'Nova categoria'}
          rotuloBotao="Criar e aplicar"
          corInicial={isSubcategoria ? '' : proximaCor(categorias)}
          isCorOpcional={isSubcategoria}
          onCancelar={() => setCriando(null)}
          onCriar={async ({ nome, cor }) => {
            if (isSubcategoria) {
              const categoryId = criando.categoria.id
              const subcategoria = await criarSubcategoria({ categoryId, nome, cor })
              onEscolher({ categoryId, subcategoryId: subcategoria.id })
            } else {
              const categoria = await criarCategoria({ nome, cor })
              onEscolher({ categoryId: categoria.id })
            }
            onFechar()
          }}
        />
      </div>
    )
  }

  return (
    <>
      <DropdownMenuRadioGroup value={valorDe(atual)} onValueChange={handleEscolher}>
        <DropdownMenuRadioItem value={SEM_CATEGORIA} className="text-grafite">
          Sem categoria
        </DropdownMenuRadioItem>
        {categorias.length > 0 && <DropdownMenuSeparator />}
        {categorias.map((categoria) => (
          <DropdownMenuGroup key={categoria.id} className="group/categoria">
            <DropdownMenuRadioItem value={categoria.id}>
              <Amostra cor={categoria.cor} />
              <span className="min-w-0 break-words">{categoria.nome}</span>
            </DropdownMenuRadioItem>
            {categoria.subcategorias.map((subcategoria) => (
              <DropdownMenuRadioItem
                key={subcategoria.id}
                value={valorDe({ categoryId: categoria.id, subcategoryId: subcategoria.id })}
                className="pl-10"
              >
                <Amostra cor={corDaSubcategoria(categoria, subcategoria.id)} />
                <span className="min-w-0 break-words">{subcategoria.nome}</span>
              </DropdownMenuRadioItem>
            ))}
            <DropdownMenuItem
              aria-label={`Nova subcategoria em ${categoria.nome}`}
              onSelect={(evento) => {
                evento.preventDefault()
                setCriando({ tipo: 'subcategoria', categoria })
              }}
              className="py-0.5 pl-10 text-xs text-grafite opacity-0 group-hover/categoria:opacity-100 focus:opacity-100 data-highlighted:opacity-100"
            >
              <Plus className="size-3" /> Nova subcategoria
            </DropdownMenuItem>
          </DropdownMenuGroup>
        ))}
      </DropdownMenuRadioGroup>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        onSelect={(evento) => {
          evento.preventDefault()
          setCriando({ tipo: 'categoria' })
        }}
        className="text-violeta-profundo [&_svg]:text-violeta-profundo"
      >
        <Plus /> Nova categoria
      </DropdownMenuItem>
    </>
  )
}
