import { cn } from 'cn'

interface PontoDeAndamentoProps {
  /** Texto para o leitor de tela; sem ele o ponto é só decoração. */
  rotulo?: string
  className?: string
}

/** O ponto que pulsa devagar (parado com movimento reduzido), na cor de destaque do tema. */
export function PontoDeAndamento({ rotulo, className }: PontoDeAndamentoProps) {
  return (
    <span
      data-ponto-andamento=""
      role={rotulo ? 'img' : undefined}
      aria-label={rotulo}
      aria-hidden={rotulo ? undefined : true}
      className={cn(
        'ponto-andamento inline-block size-1.5 shrink-0 rounded-full bg-caneta',
        className,
      )}
    />
  )
}

interface IndicadorAndamentoProps {
  /** Versão menor, para os cards da Semana. */
  isCompacto?: boolean
  className?: string
}

/** Rótulo "agora" com o ponto pulsando, ao lado do título do que está em andamento. */
export function IndicadorAndamento({ isCompacto = false, className }: IndicadorAndamentoProps) {
  return (
    <span
      data-indicador-andamento=""
      title="Em andamento"
      className={cn(
        'inline-flex items-center gap-1 font-medium whitespace-nowrap text-violeta-profundo',
        isCompacto ? 'text-[0.6875rem]' : 'text-xs',
        className,
      )}
    >
      <PontoDeAndamento className={isCompacto ? 'size-1' : undefined} />
      agora
    </span>
  )
}

/** Filete de destaque à esquerda da linha em andamento (a linha precisa ser `relative`). */
export function FileteDeAndamento({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      data-filete-andamento=""
      className={cn('absolute inset-y-0 left-0 w-[3px] rounded-full bg-caneta', className)}
    />
  )
}
