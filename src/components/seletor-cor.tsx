import { cn } from 'cn'
import { PaletaCores } from '@/components/paleta-cores'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { nomeDaCor } from '@/lib/cores'

interface SeletorCorProps {
  /** Cor exibida agora (própria ou automática). */
  cor: string
  /** Cor escolhida explicitamente; `undefined` quando é a variação automática. */
  corEscolhida?: string
  /** Nome do item, para o rótulo acessível ("Cor de Casa"). */
  nomeItem: string
  onEscolher: (cor: string) => void
  /** Se informado, mostra a opção de voltar à variação automática. */
  onUsarAutomatica?: () => void
  tamanho?: 'normal' | 'pequeno'
}

/** Amostra de cor que abre a paleta. */
export function SeletorCor({
  cor,
  corEscolhida,
  nomeItem,
  onEscolher,
  onUsarAutomatica,
  tamanho = 'normal',
}: SeletorCorProps) {
  const isAutomatica = onUsarAutomatica !== undefined && corEscolhida === undefined

  return (
    <Popover>
      <PopoverTrigger
        aria-label={`Cor de ${nomeItem}: ${isAutomatica ? 'automática' : nomeDaCor(cor)}. Trocar cor`}
        className={cn(
          'shrink-0 rounded-full ring-offset-2 ring-offset-papel hover:ring-2 hover:ring-pauta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-caneta',
          tamanho === 'normal' ? 'size-5' : 'size-4',
        )}
        style={{ backgroundColor: cor }}
      />
      <PopoverContent align="start" className="w-auto p-3">
        <PaletaCores
          rotulo={`Cor de ${nomeItem}`}
          selecionada={isAutomatica ? undefined : cor}
          nomeAmostra={nomeItem}
          onEscolher={onEscolher}
        />
        {onUsarAutomatica && (
          <button
            type="button"
            aria-pressed={isAutomatica}
            onClick={onUsarAutomatica}
            className={cn(
              'mt-3 w-full rounded-sm px-2 py-1 text-left text-sm hover:bg-accent focus-visible:outline-2 focus-visible:outline-caneta',
              isAutomatica && 'font-semibold',
            )}
          >
            {isAutomatica ? 'Usando tom da categoria' : 'Usar tom da categoria'}
          </button>
        )}
      </PopoverContent>
    </Popover>
  )
}
