import { Check } from 'lucide-react'
import { cn } from 'cn'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { PALETA_CATEGORIAS } from '@/lib/cores'

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

function nomeDaCor(hex: string) {
  return PALETA_CATEGORIAS.find((cor) => cor.hex === hex)?.nome ?? 'personalizada'
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
        <div role="radiogroup" aria-label={`Cor de ${nomeItem}`} className="grid grid-cols-6 gap-2">
          {PALETA_CATEGORIAS.map((opcao) => {
            const isSelecionada = !isAutomatica && opcao.hex === cor
            return (
              <button
                key={opcao.hex}
                type="button"
                role="radio"
                aria-checked={isSelecionada}
                aria-label={opcao.nome}
                title={opcao.nome}
                onClick={() => onEscolher(opcao.hex)}
                className="flex size-7 items-center justify-center rounded-full text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-caneta"
                style={{ backgroundColor: opcao.hex }}
              >
                {isSelecionada && <Check className="size-4" aria-hidden />}
              </button>
            )
          })}
        </div>
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
