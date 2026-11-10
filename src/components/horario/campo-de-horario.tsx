import { useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { normalizarHorario } from '@/domain/horario'

interface CampoDeHorarioProps {
  /** `HH:mm` atual; com ele aparece "Remover". */
  horario?: string
  /** Texto para o leitor de tela (ex.: "Horário de Fazer comida"). */
  rotulo: string
  onSalvar: (horario: string) => void
  onRemover: () => void
}

/**
 * Conteúdo do popover de horário: campo HH:mm (aceita "930", "9", "14h"), Enter salva, Esc (do
 * popover) cancela. Sem `<form>`: dentro de outro formulário (captura rápida), o envio subiria
 * pela árvore do React até ele.
 */
export function CampoDeHorario({ horario, rotulo, onSalvar, onRemover }: CampoDeHorarioProps) {
  const id = useId()
  const [texto, setTexto] = useState(horario ?? '')
  const [hasErro, setHasErro] = useState(false)
  const idErro = `${id}-erro`

  function handleSalvar() {
    const normalizado = normalizarHorario(texto)
    if (!normalizado) {
      setHasErro(true)
      return
    }
    onSalvar(normalizado)
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium text-tinta">
        Horário
      </label>
      <Input
        id={id}
        autoFocus
        value={texto}
        onChange={(evento) => {
          setTexto(evento.target.value)
          setHasErro(false)
        }}
        onKeyDown={(evento) => {
          if (evento.key !== 'Enter' || evento.nativeEvent.isComposing) return
          evento.preventDefault()
          handleSalvar()
        }}
        onFocus={(evento) => evento.target.select()}
        placeholder="09:00"
        inputMode="numeric"
        autoComplete="off"
        maxLength={5}
        aria-label={rotulo}
        aria-invalid={hasErro || undefined}
        aria-describedby={hasErro ? idErro : undefined}
        className="tabular-nums"
      />
      {hasErro && (
        <p id={idErro} className="text-xs text-destructive">
          Use um horário entre 00:00 e 23:59.
        </p>
      )}
      <div className="flex items-center justify-between gap-2">
        {horario ? (
          <Button type="button" variant="ghost" size="sm" onClick={onRemover}>
            Remover
          </Button>
        ) : (
          <span />
        )}
        <Button type="button" size="sm" onClick={handleSalvar}>
          Salvar
        </Button>
      </div>
    </div>
  )
}
