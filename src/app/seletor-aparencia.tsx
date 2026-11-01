import { Layers, Monitor, Moon, Sun, type LucideIcon } from 'lucide-react'
import { cn } from 'cn'
import { DicaDaBarra } from '@/app/dica-da-barra'
import { useAparencia } from '@/app/use-aparencia'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { lerEscolhaTema, lerFundo, type EscolhaTema, type Fundo } from '@/lib/aparencia'

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

const ESTILO_BOTAO_DA_BARRA =
  'flex size-8 shrink-0 items-center justify-center rounded-md text-barra-suave transition-colors hover:bg-barra-realce hover:text-barra-texto focus-visible:outline-2 focus-visible:outline-caneta data-[state=open]:bg-barra-realce'

/**
 * Rodapé da barra lateral. Expandida: tema em três botões (Claro, Escuro, Sistema) e o fundo
 * num menu. Recolhida: um ícone só (o do tema escolhido) abre tema e fundo no mesmo menu.
 */
export function SeletorAparencia({ isRecolhida }: { isRecolhida: boolean }) {
  const { escolhaTema, fundo, handleEscolherTema, handleEscolherFundo } = useAparencia()
  const IconeDoTema = TEMAS.find((tema) => tema.valor === escolhaTema)?.icone ?? Monitor

  const opcoesDeTema = (
    <>
      <DropdownMenuLabel>Tema</DropdownMenuLabel>
      <DropdownMenuRadioGroup
        value={escolhaTema}
        onValueChange={(valor) => handleEscolherTema(lerEscolhaTema(valor))}
      >
        {TEMAS.map(({ valor, nome, icone: Icone }) => (
          <DropdownMenuRadioItem key={valor} value={valor}>
            <Icone aria-hidden className="size-4" />
            {nome}
          </DropdownMenuRadioItem>
        ))}
      </DropdownMenuRadioGroup>
      <DropdownMenuSeparator />
    </>
  )
  const opcoesDeFundo = (
    <>
      <DropdownMenuLabel>Fundo</DropdownMenuLabel>
      <DropdownMenuRadioGroup
        value={fundo}
        onValueChange={(valor) => handleEscolherFundo(lerFundo(valor))}
      >
        {FUNDOS.map(({ valor, nome }) => (
          <DropdownMenuRadioItem key={valor} value={valor}>
            {nome}
          </DropdownMenuRadioItem>
        ))}
      </DropdownMenuRadioGroup>
    </>
  )

  if (isRecolhida) {
    return (
      <DropdownMenu>
        <DicaDaBarra texto="Aparência">
          <DropdownMenuTrigger
            aria-label="Aparência"
            className={cn(ESTILO_BOTAO_DA_BARRA, 'mx-auto')}
          >
            <IconeDoTema aria-hidden className="size-4" />
          </DropdownMenuTrigger>
        </DicaDaBarra>
        <DropdownMenuContent side="right" align="end" sideOffset={10} className="w-52">
          {opcoesDeTema}
          {opcoesDeFundo}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <div className="flex items-center gap-1.5">
      <div
        role="radiogroup"
        aria-label="Tema"
        aria-keyshortcuts="Control+Shift+L"
        className="flex flex-1 rounded-md border border-barra-borda bg-barra-realce p-0.5"
      >
        {TEMAS.map(({ valor, nome, icone: Icone }) => {
          const isEscolhido = valor === escolhaTema
          return (
            <DicaDaBarra key={valor} texto={nome}>
              <button
                type="button"
                role="radio"
                aria-checked={isEscolhido}
                aria-label={nome}
                onClick={() => handleEscolherTema(valor)}
                className={cn(
                  'flex h-7 flex-1 items-center justify-center rounded-[5px] transition-colors focus-visible:outline-2 focus-visible:outline-caneta',
                  isEscolhido
                    ? 'bg-papel text-caneta shadow-[0_1px_0_var(--pauta)]'
                    : 'text-barra-suave hover:text-barra-texto',
                )}
              >
                <Icone aria-hidden className="size-4" />
              </button>
            </DicaDaBarra>
          )
        })}
      </div>
      <DropdownMenu>
        <DicaDaBarra texto="Fundo">
          <DropdownMenuTrigger aria-label="Fundo" className={ESTILO_BOTAO_DA_BARRA}>
            <Layers aria-hidden className="size-4" />
          </DropdownMenuTrigger>
        </DicaDaBarra>
        <DropdownMenuContent side="right" align="end" sideOffset={10} className="w-52">
          {opcoesDeFundo}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
