import { useState } from 'react'
import { ArrowLeft, Plus, Search } from 'lucide-react'
import {
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { IconeDaEntidade } from '@/components/icones/icone-da-entidade'
import { FormularioNovaCategoria } from '@/components/seletor-categoria/formulario-nova-categoria'
import { useAcoesCategoria } from '@/hooks/use-acoes-categoria'
import { useCategorias } from '@/hooks/use-categorias'
import { corDaSubcategoria, type CategoriaComSubcategorias } from '@/lib/categorias'
import { normalizar } from '@/lib/procedimentos'
import { proximaCor } from '@/lib/cores'
import { useCorNaTela } from '@/hooks/use-cor-na-tela'
import type { TipoCategoria } from '@/db/types'

export interface CategoriaEscolhida {
  categoryId?: string
  subcategoryId?: string
}

export interface SeletorCategoriaProps {
  /** Categoria atual do item (tarefa, grupo ou procedimento). */
  atual: CategoriaEscolhida
  onEscolher: (categoria: CategoriaEscolhida) => void
  /** Só lista e cria categorias deste tipo (grupos e tarefas, ou procedimentos). */
  tipo: TipoCategoria
  /** Fecha o menu depois de criar (escolher uma opção já fecha sozinho). */
  onFechar: () => void
  /**
   * `filtro`: só para filtrar uma lista (ex.: mapa do Início): "Todas as categorias", busca e
   * só as categorias, sem subcategorias e sem criar. Escolher "Todas" devolve `{}`.
   */
  modo?: 'escolha' | 'filtro'
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
  const corNaTela = useCorNaTela()
  return (
    <span
      aria-hidden
      className="size-2.5 shrink-0 rounded-full"
      style={{ backgroundColor: corNaTela(cor) }}
    />
  )
}

/**
 * Opções de categoria para dentro de um menu (`DropdownMenuContent` ou `SubContent`):
 * "Sem categoria", categorias e subcategorias na ordem do usuário, e criar ali mesmo.
 * O que for criado já fica aplicado ao item e o menu fecha.
 */
export function SeletorCategoria({
  atual,
  onEscolher,
  tipo,
  onFechar,
  modo = 'escolha',
}: SeletorCategoriaProps) {
  const { categorias } = useCategorias(tipo)
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

  if (modo === 'filtro') {
    return <FiltroDeCategorias categorias={categorias} atual={atual} onEscolher={handleEscolher} />
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
              const categoria = await criarCategoria({ nome, cor, tipo })
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
              <IconeDaEntidade icone={categoria.icone} tamanho="sm" />
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

/** Modo filtro: busca no topo, "Todas as categorias" e as categorias na ordem do usuário. */
function FiltroDeCategorias({
  categorias,
  atual,
  onEscolher,
}: {
  categorias: CategoriaComSubcategorias[]
  atual: CategoriaEscolhida
  onEscolher: (valor: string) => void
}) {
  const [busca, setBusca] = useState('')
  const termo = normalizar(busca)
  const visiveis = termo
    ? categorias.filter((categoria) => normalizar(categoria.nome).includes(termo))
    : categorias

  return (
    <>
      <label className="mb-1 flex items-center gap-2 rounded-md border border-input px-2">
        <Search aria-hidden className="size-3.5 text-grafite" />
        <input
          autoFocus
          value={busca}
          onChange={(evento) => setBusca(evento.target.value)}
          onKeyDown={(evento) => {
            if (evento.key === 'Escape' || evento.key === 'Tab') return
            if (evento.key === 'ArrowDown') {
              evento.preventDefault()
              evento.currentTarget
                .closest('[role="menu"]')
                ?.querySelector<HTMLElement>('[role="menuitemradio"]')
                ?.focus()
            } else if (evento.key === 'Enter') {
              evento.preventDefault()
              onEscolher((termo && visiveis[0]?.id) || SEM_CATEGORIA)
            }
            // Dentro do menu: letras não podem virar a busca por digitação do Radix.
            evento.stopPropagation()
          }}
          placeholder="Buscar categoria"
          aria-label="Buscar categoria"
          className="h-8 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-grafite/70"
        />
      </label>
      <DropdownMenuRadioGroup value={atual.categoryId ?? SEM_CATEGORIA} onValueChange={onEscolher}>
        {!termo && (
          <DropdownMenuRadioItem value={SEM_CATEGORIA}>Todas as categorias</DropdownMenuRadioItem>
        )}
        {visiveis.map((categoria) => (
          <DropdownMenuRadioItem key={categoria.id} value={categoria.id}>
            <Amostra cor={categoria.cor} />
            <IconeDaEntidade icone={categoria.icone} tamanho="sm" />
            <span className="min-w-0 break-words">{categoria.nome}</span>
          </DropdownMenuRadioItem>
        ))}
        {visiveis.length === 0 && (
          <p className="px-2 py-1.5 text-sm text-grafite">Nenhuma categoria com esse nome.</p>
        )}
      </DropdownMenuRadioGroup>
    </>
  )
}
