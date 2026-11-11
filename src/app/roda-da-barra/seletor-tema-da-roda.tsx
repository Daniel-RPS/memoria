import { useEffect, useRef, type ReactNode } from 'react'
import { Monitor, Moon, Sun, type LucideIcon } from 'lucide-react'
import { cn } from 'cn'
import { useAparencia } from '@/app/use-aparencia'
import type { EscolhaTema, Fundo } from '@/lib/aparencia'

const TEMAS: { valor: EscolhaTema; nome: string; icone: LucideIcon }[] = [
  { valor: 'claro', nome: 'Claro', icone: Sun },
  { valor: 'escuro', nome: 'Escuro', icone: Moon },
  { valor: 'sistema', nome: 'Sistema', icone: Monitor },
]

const FUNDOS: { valor: Fundo; nome: string }[] = [
  { valor: 'aurora', nome: 'Aurora' },
  { valor: 'pontos', nome: 'Grade de pontos' },
  { valor: 'grade', nome: 'Grade com holofote' },
  { valor: 'liso', nome: 'Liso' },
]

interface OpcaoProps {
  isEscolhida: boolean
  onEscolher: () => void
  children: ReactNode
}

function Opcao({ isEscolhida, onEscolher, children }: OpcaoProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={isEscolhida}
      onClick={onEscolher}
      className={cn(
        'flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-sm transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-caneta motion-reduce:transition-none',
        isEscolhida
          ? 'bg-accent font-semibold text-violeta-profundo'
          : 'text-popover-foreground hover:bg-muted',
      )}
    >
      {children}
    </button>
  )
}

/**
 * Mini-seletor colado na roda Ajustes: tema (Claro, Escuro, Sistema) e o fundo do app, que antes
 * ficavam no rodapé da barra. Abre com o foco na opção de tema escolhida.
 */
export function SeletorTemaDaRoda({ className }: { className?: string }) {
  const { escolhaTema, fundo, handleEscolherTema, handleEscolherFundo } = useAparencia()
  const grupoTemaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    grupoTemaRef.current?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus()
  }, [])

  return (
    <div
      role="dialog"
      aria-label="Aparência"
      className={cn(
        'w-52 rounded-lg border border-border bg-popover p-1.5 text-popover-foreground shadow-xl',
        className,
      )}
    >
      <p className="px-2 pt-1 pb-1 text-xs font-semibold text-muted-foreground">Tema</p>
      <div
        ref={grupoTemaRef}
        role="radiogroup"
        aria-label="Tema"
        aria-keyshortcuts="Control+Shift+L"
        className="flex flex-col gap-0.5"
      >
        {TEMAS.map(({ valor, nome, icone: Icone }) => (
          <Opcao
            key={valor}
            isEscolhida={valor === escolhaTema}
            onEscolher={() => handleEscolherTema(valor)}
          >
            <Icone aria-hidden className="size-4" />
            {nome}
          </Opcao>
        ))}
      </div>
      <div className="my-1.5 h-px bg-border" />
      <p className="px-2 pb-1 text-xs font-semibold text-muted-foreground">Fundo</p>
      <div role="radiogroup" aria-label="Fundo" className="flex flex-col gap-0.5">
        {FUNDOS.map(({ valor, nome }) => (
          <Opcao
            key={valor}
            isEscolhida={valor === fundo}
            onEscolher={() => handleEscolherFundo(valor)}
          >
            {nome}
          </Opcao>
        ))}
      </div>
    </div>
  )
}
