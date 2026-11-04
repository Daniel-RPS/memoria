import { useEffect, useState } from 'react'
import { cn } from 'cn'
import { formatarTempoAgora } from '@/domain/tempo'

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
  /** Momento ISO (UTC) em que o andamento começou; exibe a duração ao lado de "agora" no Dia. */
  desde?: string
  /** Versão menor, para os cards da Semana (sem tempo, falta espaço). */
  isCompacto?: boolean
  className?: string
}

/** Rótulo "agora" com o ponto pulsando, ao lado do título do que está em andamento. */
export function IndicadorAndamento({
  desde,
  isCompacto = false,
  className,
}: IndicadorAndamentoProps) {
  const [agoraMs, setAgoraMs] = useState(() => Date.now())

  useEffect(() => {
    if (isCompacto || !desde) return
    const id = window.setInterval(() => setAgoraMs(Date.now()), 60_000)
    return () => window.clearInterval(id)
  }, [desde, isCompacto])

  const inicioMs = desde ? new Date(desde).getTime() : Number.NaN
  const duracaoMs =
    !isCompacto && !Number.isNaN(inicioMs) ? Math.max(0, agoraMs - inicioMs) : undefined

  return (
    <span
      data-indicador-andamento=""
      title="Em andamento"
      className={cn(
        'inline-flex items-center gap-1 font-medium whitespace-nowrap text-violeta-profundo tabular-nums',
        isCompacto ? 'text-[0.6875rem]' : 'text-xs',
        className,
      )}
    >
      <PontoDeAndamento className={isCompacto ? 'size-1' : undefined} />
      {duracaoMs !== undefined ? formatarTempoAgora(duracaoMs) : 'agora'}
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
