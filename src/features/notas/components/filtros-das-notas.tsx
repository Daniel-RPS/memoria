import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from 'cn'
import { IconeDaEntidade } from '@/components/icones/icone-da-entidade'
import { SeletorCategoria } from '@/components/seletor-categoria/seletor-categoria'
import { GATILHO_DE_FILTRO, SeletorDeDia } from '@/components/seletor-de-dia'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Category, DataLocal } from '@/db/types'
import { useCorNaTela } from '@/hooks/use-cor-na-tela'
import { ATALHOS_DAS_NOTAS, type FiltroDeData } from '@/lib/filtro-de-data'
import type { FiltroDeTipo, ModoDasNotas } from '@/lib/notas'

const MODOS: { valor: ModoDasNotas; rotulo: string }[] = [
  { valor: 'categoria', rotulo: 'Por categoria' },
  { valor: 'grupo', rotulo: 'Por grupo' },
  { valor: 'recentes', rotulo: 'Recentes' },
]

const TIPOS: { valor: FiltroDeTipo; rotulo: string }[] = [
  { valor: 'todas', rotulo: 'Todas' },
  { valor: 'tarefa', rotulo: 'Tarefas' },
  { valor: 'grupo', rotulo: 'Grupos' },
  { valor: 'item', rotulo: 'Itens' },
  { valor: 'avulsa', rotulo: 'Avulsas' },
]

const GATILHO = GATILHO_DE_FILTRO

interface FiltrosDasNotasProps {
  modo: ModoDasNotas
  onModo: (modo: ModoDasNotas) => void
  tipo: FiltroDeTipo
  onTipo: (tipo: FiltroDeTipo) => void
  /** Categoria escolhida (já conferida: existe). */
  categoria?: Pick<Category, 'id' | 'nome' | 'cor' | 'icone'>
  hasCategorias: boolean
  onCategoria: (categoryId: string | undefined) => void
  filtroDeDia: FiltroDeData
  onFiltroDeDia: (filtro: FiltroDeData) => void
  hoje: DataLocal
}

/** Organização (Por categoria · Por grupo · Recentes), tipo de vínculo, categoria e dia. */
export function FiltrosDasNotas({
  modo,
  onModo,
  tipo,
  onTipo,
  categoria,
  hasCategorias,
  onCategoria,
  filtroDeDia,
  onFiltroDeDia,
  hoje,
}: FiltrosDasNotasProps) {
  const corNaTela = useCorNaTela()
  const [isCategoriaAberta, setIsCategoriaAberta] = useState(false)
  const rotuloTipo = TIPOS.find((opcao) => opcao.valor === tipo)?.rotulo ?? 'Todas'

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <div
        role="radiogroup"
        aria-label="Organizar notas"
        className="flex rounded-md border border-pauta bg-papel p-0.5"
      >
        {MODOS.map((opcao) => (
          <button
            key={opcao.valor}
            type="button"
            role="radio"
            aria-checked={modo === opcao.valor}
            onClick={() => onModo(opcao.valor)}
            className={cn(
              'h-7 rounded-[5px] px-2.5 text-sm whitespace-nowrap text-grafite transition-colors hover:text-tinta focus-visible:outline-2 focus-visible:outline-caneta motion-reduce:transition-none',
              modo === opcao.valor &&
                'bg-caneta text-primary-foreground hover:text-primary-foreground',
            )}
          >
            {opcao.rotulo}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-1">
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger aria-label={`Tipo de vínculo: ${rotuloTipo}`} className={GATILHO}>
            {rotuloTipo}
            <ChevronDown aria-hidden className="size-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" collisionPadding={8} className="w-40">
            <DropdownMenuRadioGroup
              value={tipo}
              onValueChange={(valor) => onTipo(valor as FiltroDeTipo)}
            >
              {TIPOS.map((opcao) => (
                <DropdownMenuRadioItem key={opcao.valor} value={opcao.valor}>
                  {opcao.rotulo}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {hasCategorias && (
          <DropdownMenu open={isCategoriaAberta} onOpenChange={setIsCategoriaAberta} modal={false}>
            <DropdownMenuTrigger
              aria-label={`Filtrar por categoria: ${categoria?.nome ?? 'Todas as categorias'}`}
              className={GATILHO}
            >
              {categoria && (
                <span
                  aria-hidden
                  className="size-2 rounded-full"
                  style={{ backgroundColor: corNaTela(categoria.cor) }}
                />
              )}
              <IconeDaEntidade icone={categoria?.icone} tamanho="sm" />
              <span className="max-w-40 truncate">{categoria?.nome ?? 'Todas as categorias'}</span>
              <ChevronDown aria-hidden className="size-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              collisionPadding={8}
              className="max-h-[min(22rem,var(--radix-dropdown-menu-content-available-height))] w-60 overflow-y-auto p-1.5"
            >
              <SeletorCategoria
                tipo="grupo"
                modo="filtro"
                atual={{ categoryId: categoria?.id }}
                onEscolher={(escolhida) => {
                  onCategoria(escolhida.categoryId)
                  setIsCategoriaAberta(false)
                }}
                onFechar={() => setIsCategoriaAberta(false)}
              />
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <SeletorDeDia
          filtro={filtroDeDia}
          onMudar={onFiltroDeDia}
          atalhos={ATALHOS_DAS_NOTAS}
          hoje={hoje}
          rotulo="Filtrar pelo dia da edição"
        />
      </div>
    </div>
  )
}
