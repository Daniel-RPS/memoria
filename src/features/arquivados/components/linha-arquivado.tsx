import { ChevronDown, MoreHorizontal, Trash2, Undo2 } from 'lucide-react'
import { cn } from 'cn'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { TextoComLinks } from '@/components/texto-com-links'
import type { DataLocal } from '@/db/types'
import { linksDoTexto } from '@/domain/links'
import { useCorDeTraco } from '@/hooks/use-cor-na-tela'
import {
  NOMES_DOS_TIPOS,
  precisaDeDia,
  rotuloDoArquivamento,
  type ItemArquivado,
} from '@/lib/arquivados'
import type { AcoesDaLinha } from '@/features/arquivados/components/acoes-da-linha'
import { ItensDeDesarquivar } from '@/features/arquivados/components/itens-de-desarquivar'
import { ICONES_DOS_TIPOS } from '@/features/arquivados/components/tipos-de-arquivado'

const CLASSE_TITULO =
  'block max-w-full truncate rounded-sm text-left font-medium outline-none hover:underline focus-visible:outline-2 focus-visible:outline-caneta'

interface LinhaArquivadoProps {
  item: ItemArquivado
  hoje: DataLocal
  isSelecionado: boolean
  onSelecionar: (isSelecionado: boolean) => void
  acoes: AcoesDaLinha
}

/**
 * Uma linha de Arquivados: caixa de seleção, faixa na cor da categoria, ícone do tipo, título
 * com o detalhe apagado e "arquivado há…". Desarquivar e Abrir aparecem ao passar o mouse (ou
 * com o foco); o menu ⋯ tem as três ações.
 */
export function LinhaArquivado({
  item,
  hoje,
  isSelecionado,
  onSelecionar,
  acoes,
}: LinhaArquivadoProps) {
  const corDeTraco = useCorDeTraco()
  const Icone = ICONES_DOS_TIPOS[item.tipo]
  const isComDia = precisaDeDia(item)

  return (
    <li
      data-tipo={item.tipo}
      className={cn(
        'group/linha flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-accent/40 focus-within:bg-accent/40 motion-reduce:transition-none',
        isSelecionado && 'bg-accent/60',
      )}
    >
      <Checkbox
        checked={isSelecionado}
        onCheckedChange={(valor) => onSelecionar(valor === true)}
        aria-label={`Selecionar ${item.titulo}`}
      />
      <span
        aria-hidden
        data-cor={item.cor ? corDeTraco(item.cor) : undefined}
        className={cn('h-9 w-1 shrink-0 rounded-full', !item.cor && 'bg-grafite/35')}
        style={item.cor ? { backgroundColor: corDeTraco(item.cor) } : undefined}
      />
      <Icone aria-hidden className="size-4 shrink-0 text-grafite" />
      <div className="min-w-0 flex-1">
        {linksDoTexto(item.titulo).length > 0 ? (
          // Link não pode ficar dentro de <button>: com endereço no título, o "botão" é um span.
          <span
            role="button"
            tabIndex={0}
            onClick={() => acoes.onAbrir(item)}
            onKeyDown={(evento) => {
              if (evento.target !== evento.currentTarget) return
              if (evento.key === 'Enter' || evento.key === ' ') {
                evento.preventDefault()
                acoes.onAbrir(item)
              }
            }}
            className={cn(CLASSE_TITULO, 'cursor-pointer')}
          >
            <TextoComLinks texto={item.titulo} />
            <span className="sr-only"> ({NOMES_DOS_TIPOS[item.tipo].singular})</span>
          </span>
        ) : (
          <button type="button" onClick={() => acoes.onAbrir(item)} className={CLASSE_TITULO}>
            {item.titulo}
            <span className="sr-only"> ({NOMES_DOS_TIPOS[item.tipo].singular})</span>
          </button>
        )}
        <p className="truncate text-sm text-grafite">{item.detalhe}</p>
      </div>

      <div className="relative flex shrink-0 items-center self-stretch">
        <span className="hidden text-xs whitespace-nowrap text-grafite transition-opacity group-focus-within/linha:opacity-0 group-hover/linha:opacity-0 sm:block motion-reduce:transition-none">
          {rotuloDoArquivamento(item.arquivadoEm)}
        </span>
        {/* Por cima do "arquivado há…": as ações não tomam largura do título. */}
        <div className="pointer-events-none absolute top-1/2 right-0 flex -translate-y-1/2 items-center gap-1 bg-linear-to-l from-card from-80% to-transparent pl-8 opacity-0 transition-opacity group-focus-within/linha:pointer-events-auto group-focus-within/linha:opacity-100 group-hover/linha:pointer-events-auto group-hover/linha:opacity-100 has-aria-expanded:pointer-events-auto has-aria-expanded:opacity-100 motion-reduce:transition-none">
          {isComDia ? (
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" aria-label={`Desarquivar ${item.titulo}`}>
                  <Undo2 /> Desarquivar <ChevronDown />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" collisionPadding={8} className="w-auto min-w-48">
                <ItensDeDesarquivar item={item} hoje={hoje} acoes={acoes} />
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              aria-label={`Desarquivar ${item.titulo}`}
              onClick={() => acoes.onDesarquivar([item])}
            >
              <Undo2 /> Desarquivar
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            aria-label={`Abrir ${item.titulo}`}
            onClick={() => acoes.onAbrir(item)}
          >
            Abrir
          </Button>
        </div>
      </div>

      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Mais ações para ${item.titulo}`}
            className="shrink-0 text-grafite"
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" collisionPadding={8} className="w-auto min-w-52">
          {isComDia ? (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Undo2 /> Desarquivar
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <ItensDeDesarquivar item={item} hoje={hoje} acoes={acoes} />
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          ) : (
            <DropdownMenuItem onSelect={() => acoes.onDesarquivar([item])}>
              <Undo2 /> Desarquivar
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={() => acoes.onAbrir(item)}>
            Abrir (só leitura)
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => acoes.onExcluir([item])}>
            <Trash2 /> Excluir permanentemente…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  )
}
