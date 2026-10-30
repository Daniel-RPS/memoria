import { cn } from 'cn'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import type { CampoVariavel, Step } from '@/db/types'
import { Alerta } from '@/features/procedimentos/components/conteudo-procedimento'
import { BlocoCodigo } from '@/features/procedimentos/components/bloco-codigo'
import { TextoComCampos } from '@/features/procedimentos/components/texto-com-campos'

export type EstadoPasso = 'feito' | 'pulado' | 'pendente'

interface PassoExecucaoProps {
  numero: number
  passo: Step
  campos: CampoVariavel[]
  valores: Record<string, string>
  estado: EstadoPasso
  onMudar: (estado: EstadoPasso) => void
}

/** Um passo do checklist: marcar como feito, pular ou voltar a pendente. */
export function PassoExecucao({
  numero,
  passo,
  campos,
  valores,
  estado,
  onMudar,
}: PassoExecucaoProps) {
  const isFeito = estado === 'feito'
  const isPulado = estado === 'pulado'

  return (
    <li
      className={cn(
        'flex gap-3 rounded-md border bg-papel p-3 sm:p-4',
        isFeito && 'border-caneta/30 bg-accent/40',
        isPulado && 'border-dashed border-grafite/50 bg-transparent',
        estado === 'pendente' && 'border-pauta',
      )}
    >
      <div className="flex flex-col items-center gap-1 pt-0.5">
        <Checkbox
          checked={isFeito}
          onCheckedChange={(marcado) => onMudar(marcado === true ? 'feito' : 'pendente')}
          aria-label={`Passo ${numero} feito`}
          className="size-5 rounded-[4px] border-2 border-tinta/70 data-[state=checked]:border-caneta data-[state=checked]:bg-caneta"
        />
        <span aria-hidden className="text-xs font-semibold text-grafite tabular-nums">
          {numero}
        </span>
      </div>
      <div className={cn('min-w-0 flex-1', isPulado && 'text-grafite')}>
        <p className="whitespace-pre-wrap">
          <TextoComCampos texto={passo.texto} campos={campos} valores={valores} />
          {isPulado && <span className="ml-2 text-sm italic">(pulado)</span>}
        </p>
        {passo.subpassos.length > 0 && (
          <ul className="mt-1 list-disc pl-5 text-[0.9375rem]">
            {passo.subpassos.map((subpasso) => (
              <li key={subpasso.id}>
                <TextoComCampos texto={subpasso.texto} campos={campos} valores={valores} />
              </li>
            ))}
          </ul>
        )}
        {passo.alerta && (
          <Alerta
            texto={passo.alerta}
            procedimento={{ camposVariaveis: campos }}
            valores={valores}
          />
        )}
        {passo.codigo && <BlocoCodigo codigo={passo.codigo} campos={campos} valores={valores} />}
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="self-start text-grafite"
        onClick={() => onMudar(isPulado ? 'pendente' : 'pulado')}
        aria-label={isPulado ? `Desfazer pulo do passo ${numero}` : `Pular passo ${numero}`}
      >
        {isPulado ? 'Desfazer pulo' : 'Pular'}
      </Button>
    </li>
  )
}
