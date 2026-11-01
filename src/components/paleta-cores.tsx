import { Check } from 'lucide-react'
import { cn } from 'cn'
import { PALETA_CATEGORIAS } from '@/lib/cores'

interface PaletaCoresProps {
  /** Nome acessível do grupo, ex.: "Cor de Casa". */
  rotulo: string
  /** Cor marcada; `undefined` = nenhuma (ex.: tom automático). */
  selecionada?: string
  onEscolher: (cor: string) => void
  tamanho?: 'normal' | 'pequeno'
}

/** As cores da paleta como botões de escolha única. */
export function PaletaCores({
  rotulo,
  selecionada,
  onEscolher,
  tamanho = 'normal',
}: PaletaCoresProps) {
  return (
    <div role="radiogroup" aria-label={rotulo} className="grid w-fit grid-cols-6 gap-2">
      {PALETA_CATEGORIAS.map((opcao) => {
        const isSelecionada = opcao.hex === selecionada
        return (
          <button
            key={opcao.hex}
            type="button"
            role="radio"
            aria-checked={isSelecionada}
            aria-label={opcao.nome}
            title={opcao.nome}
            onClick={() => onEscolher(opcao.hex)}
            className={cn(
              'flex items-center justify-center rounded-full text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-caneta',
              tamanho === 'normal' ? 'size-7' : 'size-6',
            )}
            style={{ backgroundColor: opcao.hex }}
          >
            {isSelecionada && <Check className="size-4" aria-hidden />}
          </button>
        )
      })}
    </div>
  )
}
