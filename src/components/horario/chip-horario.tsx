import { forwardRef, type ComponentPropsWithoutRef } from 'react'
import { Clock } from 'lucide-react'
import { cn } from 'cn'

interface ChipHorarioProps extends ComponentPropsWithoutRef<'button'> {
  /** `HH:mm`. */
  horario: string
  /** Semana: menor e no fluxo do texto, sem empurrar o título. */
  isCompacto?: boolean
}

/** Chip do horário de início ("🕘 09:00"); clicar abre o popover para alterar. */
export const ChipHorario = forwardRef<HTMLButtonElement, ChipHorarioProps>(function ChipHorario(
  { horario, isCompacto = false, className, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      data-sem-arrasto=""
      data-chip-horario=""
      aria-label={`Horário ${horario}. Alterar horário`}
      title="Alterar horário"
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-[3px] font-medium whitespace-nowrap text-caneta tabular-nums hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-caneta',
        isCompacto ? 'h-4 px-0.5 align-[-0.125rem] text-[0.6875rem]' : 'px-1 text-xs',
        className,
      )}
      {...props}
    >
      <Clock aria-hidden className={isCompacto ? 'size-2.5' : 'size-3'} />
      {horario}
    </button>
  )
})
