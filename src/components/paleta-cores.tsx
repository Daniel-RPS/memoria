import { useRef, useState } from 'react'
import { Check, Plus } from 'lucide-react'
import { cn } from 'cn'
import { MisturadorCor } from '@/components/misturador-cor'
import { useCoresRecentes } from '@/hooks/use-cores-recentes'
import { isCorClara, isCorDaPaleta, PALETA_CATEGORIAS } from '@/lib/cores'

interface PaletaCoresProps {
  /** Nome acessível do grupo, ex.: "Cor de Casa". */
  rotulo: string
  /** Cor marcada; `undefined` = nenhuma (ex.: tom automático). */
  selecionada?: string
  onEscolher: (cor: string) => void
  tamanho?: 'normal' | 'pequeno'
  /** Nome mostrado na prévia do misturador (ex.: o nome da categoria). */
  nomeAmostra?: string
}

const ARCO_IRIS =
  'conic-gradient(from 180deg, #f43f5e, #f59e0b, #eab308, #22c55e, #06b6d4, #3b82f6, #8b5cf6, #ec4899, #f43f5e)'

/**
 * Escolha de cor única do app: as 12 cores da paleta, a bolinha "Cor personalizada" (abre o
 * misturador ali mesmo) e as últimas cores personalizadas usadas. Cor personalizada escolhida
 * aparece na própria bolinha, com o ✓.
 */
export function PaletaCores({
  rotulo,
  selecionada,
  onEscolher,
  tamanho = 'normal',
  nomeAmostra = 'Categoria',
}: PaletaCoresProps) {
  const recentes = useCoresRecentes()
  const [isMisturando, setIsMisturando] = useState(false)
  const botaoPersonalizadaRef = useRef<HTMLButtonElement>(null)
  const isPersonalizada = selecionada !== undefined && !isCorDaPaleta(selecionada)
  const tamanhoBolinha = tamanho === 'normal' ? 'size-7' : 'size-6'
  const classeBolinha = cn(
    'flex shrink-0 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-caneta',
    tamanhoBolinha,
  )

  function handleFecharMisturador() {
    setIsMisturando(false)
    botaoPersonalizadaRef.current?.focus()
  }

  return (
    <div className="flex w-fit flex-col gap-2">
      <div role="radiogroup" aria-label={rotulo} className="flex flex-col gap-2">
        <div className="grid w-fit grid-cols-6 gap-2">
          {PALETA_CATEGORIAS.map((opcao) => {
            const isSelecionada = opcao.hex === selecionada?.toLowerCase()
            return (
              <button
                key={opcao.hex}
                type="button"
                role="radio"
                aria-checked={isSelecionada}
                aria-label={opcao.nome}
                title={opcao.nome}
                onClick={() => onEscolher(opcao.hex)}
                className={cn(classeBolinha, 'text-white')}
                style={{ backgroundColor: opcao.hex }}
              >
                {isSelecionada && <Check className="size-4" aria-hidden />}
              </button>
            )
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-pauta pt-2">
          <button
            ref={botaoPersonalizadaRef}
            type="button"
            role="radio"
            aria-checked={isPersonalizada}
            aria-expanded={isMisturando}
            aria-label={
              isPersonalizada
                ? `Cor personalizada ${selecionada.toUpperCase()}`
                : 'Cor personalizada'
            }
            title="Cor personalizada"
            onClick={() => setIsMisturando((isAberto) => !isAberto)}
            className={cn(
              classeBolinha,
              isPersonalizada && (isCorClara(selecionada) ? 'text-black/75' : 'text-white'),
              !isPersonalizada && 'text-white',
            )}
            style={{ background: isPersonalizada ? selecionada : ARCO_IRIS }}
          >
            {isPersonalizada ? (
              <Check className="size-4" aria-hidden />
            ) : (
              <Plus className="size-4 drop-shadow-[0_0_1px_rgb(0_0_0/0.6)]" aria-hidden />
            )}
          </button>
          {recentes.length > 0 && (
            <div role="group" aria-label="Cores personalizadas recentes" className="flex gap-1.5">
              {recentes.map((cor) => (
                <button
                  key={cor}
                  type="button"
                  aria-label={`Usar ${cor.toUpperCase()}`}
                  title={cor.toUpperCase()}
                  onClick={() => {
                    setIsMisturando(false)
                    onEscolher(cor)
                  }}
                  className={cn(
                    'size-5 shrink-0 rounded-full ring-1 ring-pauta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-caneta',
                    cor === selecionada?.toLowerCase() && 'ring-2 ring-tinta',
                  )}
                  style={{ backgroundColor: cor }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {isMisturando && (
        <MisturadorCor
          corInicial={selecionada ?? recentes[0] ?? PALETA_CATEGORIAS[6].hex}
          nomeAmostra={nomeAmostra || 'Categoria'}
          onAplicar={(cor) => {
            handleFecharMisturador()
            // Depois de fechar: quem chama pode levar o foco para outro lugar (ex.: o nome).
            onEscolher(cor)
          }}
          onCancelar={handleFecharMisturador}
        />
      )}
    </div>
  )
}
