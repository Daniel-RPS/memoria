import { useId, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from 'cn'
import { GlassCard, type GlassCardBorda } from '@/components/ui/glass-card'
import { useLayoutDoDia } from '@/hooks/use-layout-do-dia'
import type { CartaoDoInicio } from '@/lib/layout-do-dia'

interface ResumoLateralProps {
  titulo: ReactNode
  /** Rótulo para acessibilidade caso o título seja um nó complexo (ex.: com ícone/ponto). */
  rotuloAria?: string
  /** Número ou ação discreta à direita do título. */
  extra?: ReactNode
  /** `alerta`: título em laranja suave (Atrasadas). */
  tom?: 'normal' | 'alerta'
  /** Cor da borda fina de 1px ('accent', 'warning' ou 'padrao'). */
  borda?: GlassCardBorda
  /** Id para tornar o cartão recolhível e persistir o estado ('andamento' | 'hoje' | 'atrasadas'). */
  idCartao?: CartaoDoInicio
  /** Elemento extra colado na base quando recolhido (ex.: barra fina de 2px de Hoje). */
  barraRecolhido?: ReactNode
  className?: string
  children: ReactNode
}

/** Bloco em cartão de vidro da coluna lateral do Início: título sobre um fio e o conteúdo (recolhível opcional). */
export function ResumoLateral({
  titulo,
  rotuloAria,
  extra,
  tom = 'normal',
  borda = 'padrao',
  idCartao,
  barraRecolhido,
  className,
  children,
}: ResumoLateralProps) {
  const ariaLabel = rotuloAria ?? (typeof titulo === 'string' ? titulo : undefined)
  const idConteudo = useId()
  const { isCartaoRecolhido, handleAlternarCartao } = useLayoutDoDia()

  const isRecolhivel = idCartao !== undefined
  const isAberto = isRecolhivel ? !isCartaoRecolhido(idCartao) : true

  return (
    <GlassCard
      as="section"
      aria-label={ariaLabel}
      borda={borda}
      className={cn(
        'transition-[padding] duration-200',
        isAberto ? 'px-4 pt-3.5 pb-4' : 'px-4 py-3',
        className,
      )}
    >
      <header
        className={cn(
          'flex items-baseline justify-between gap-3',
          isAberto && 'border-b border-pauta/60 pb-1.5',
        )}
      >
        {isRecolhivel ? (
          <h2 className="w-full text-sm font-semibold tracking-[-0.01em]">
            <button
              type="button"
              aria-expanded={isAberto}
              aria-controls={idConteudo}
              onClick={() => handleAlternarCartao(idCartao)}
              className="group/cabecalho flex w-full items-baseline justify-between gap-3 rounded text-left outline-none focus-visible:ring-2 focus-visible:ring-caneta"
            >
              <span className={cn('min-w-0', tom === 'alerta' && 'text-alerta')}>{titulo}</span>
              <span className="flex shrink-0 items-center gap-1.5 font-normal">
                {extra}
                <ChevronDown
                  aria-hidden
                  className={cn(
                    'size-3.5 shrink-0 text-grafite transition-transform duration-200 ease-out motion-reduce:transition-none group-hover/cabecalho:text-tinta',
                    isAberto && 'rotate-180',
                  )}
                />
              </span>
            </button>
          </h2>
        ) : (
          <>
            <h2
              className={cn(
                'text-sm font-semibold tracking-[-0.01em]',
                tom === 'alerta' && 'text-alerta',
              )}
            >
              {titulo}
            </h2>
            {extra}
          </>
        )}
      </header>

      {isRecolhivel ? (
        <div
          id={idConteudo}
          inert={!isAberto}
          className={cn(
            'grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none',
            isAberto ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
          )}
        >
          <div className="overflow-hidden">{children}</div>
        </div>
      ) : (
        children
      )}

      {!isAberto && barraRecolhido}
    </GlassCard>
  )
}
