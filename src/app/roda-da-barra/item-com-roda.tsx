import { useRef, type KeyboardEvent, type MouseEvent, type PointerEvent } from 'react'
import { ChevronRight, type LucideIcon } from 'lucide-react'
import { cn } from 'cn'
import { classesDoItemDaBarra } from '@/app/estilo-item-da-barra'
import { RodaDaBarra, type SetorDaRoda } from '@/app/roda-da-barra/roda-da-barra'
import type { ControleDaRoda, IdDaRoda } from '@/app/roda-da-barra/use-roda-da-barra'

interface ItemComRodaProps {
  id: IdDaRoda
  nome: string
  icone: LucideIcon
  setores: SetorDaRoda[]
  isRecolhida: boolean
  /** Lembrete visível com a roda fechada: bolinha laranja no ícone. */
  aviso?: string
  controle: ControleDaRoda
}

/**
 * Item da barra que abre uma roda de destinos: com o mouse por cima (o hover vale também sobre a
 * roda, que é filha no React), por clique/toque ou pelo teclado. Fica destacado quando a página
 * atual é um dos seus setores.
 */
export function ItemComRoda({
  id,
  nome,
  icone: Icone,
  setores,
  isRecolhida,
  aviso,
  controle,
}: ItemComRodaProps) {
  const botaoRef = useRef<HTMLButtonElement>(null)
  const isAberta = controle.aberta?.id === id
  const isAtiva = setores.some((setor) => setor.isAtiva)

  function handleEntrar(evento: PointerEvent<HTMLDivElement>) {
    if (evento.pointerType === 'mouse') controle.handleEntrarComMouse(id)
  }

  function handleSair(evento: PointerEvent<HTMLDivElement>) {
    if (evento.pointerType === 'mouse') controle.handleSairComMouse()
  }

  function handleClicar(evento: MouseEvent<HTMLButtonElement>) {
    const nativo = evento.nativeEvent as globalThis.PointerEvent
    controle.handleClicar(id, nativo.pointerType === 'mouse')
  }

  function handleTecla(evento: KeyboardEvent<HTMLButtonElement>) {
    if (evento.key === 'Enter' || evento.key === ' ' || evento.key === 'ArrowRight') {
      evento.preventDefault()
      controle.handleAbrirPeloTeclado(id)
    } else if (evento.key === 'Escape' && isAberta) {
      evento.preventDefault()
      controle.handleFechar()
    }
  }

  function handleFechar(isDevolverFoco: boolean) {
    controle.handleFechar()
    if (isDevolverFoco) botaoRef.current?.focus()
  }

  return (
    <div onPointerEnter={handleEntrar} onPointerLeave={handleSair}>
      <button
        ref={botaoRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={isAberta}
        aria-description={aviso}
        onClick={handleClicar}
        onKeyDown={handleTecla}
        className={cn(
          classesDoItemDaBarra(isAtiva, isRecolhida),
          isAberta && !isAtiva && 'bg-barra-realce text-barra-texto',
        )}
      >
        <span className="relative shrink-0">
          <Icone aria-hidden className="size-4" />
          {aviso && (
            <span
              aria-hidden
              data-aviso
              className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-alerta ring-2 ring-barra"
            />
          )}
        </span>
        <span
          className={cn(
            'transition-opacity duration-200 motion-reduce:transition-none',
            isRecolhida && 'opacity-0',
          )}
        >
          {nome}
        </span>
        <ChevronRight
          aria-hidden
          className={cn(
            'ml-auto size-3.5 shrink-0 transition-[opacity,translate] duration-200 motion-reduce:transition-none',
            isAtiva ? 'text-primary-foreground/80' : 'text-barra-suave',
            isAberta && 'translate-x-0.5',
            isRecolhida && 'opacity-0',
          )}
        />
      </button>
      {isAberta && controle.aberta && (
        <RodaDaBarra
          nome={nome}
          setores={setores}
          ancoraRef={botaoRef}
          origem={controle.aberta.origem}
          onFechar={handleFechar}
          onTravar={controle.handleTravar}
        />
      )}
    </div>
  )
}
