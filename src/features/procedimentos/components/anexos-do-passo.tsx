import { useState } from 'react'
import { Paperclip } from 'lucide-react'
import { PainelAnexos } from '@/components/anexos/painel-anexos'
import { Button } from '@/components/ui/button'
import { useAnexos } from '@/hooks/use-anexos'

interface AnexosDoPassoProps {
  passoId: string
  numero: number
  /** Versões antigas e modo execução só mostram. */
  isSomenteLeitura?: boolean
}

/** Anexos de um passo. Para não poluir a lista, o painel só abre quando há anexos ou pedido. */
export function AnexosDoPasso({ passoId, numero, isSomenteLeitura }: AnexosDoPassoProps) {
  const anexos = useAnexos({ tipo: 'step', id: passoId })
  const [isAberto, setIsAberto] = useState(false)
  const dono = { tipo: 'step' as const, id: passoId }
  const descricao = `do passo ${numero}`

  if (isSomenteLeitura) {
    return anexos.length > 0 ? (
      <div className="mt-2">
        <PainelAnexos dono={dono} descricaoDono={descricao} isSomenteLeitura />
      </div>
    ) : null
  }

  if (anexos.length === 0 && !isAberto) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="mt-1 -ml-2 h-7 text-grafite"
        onClick={() => setIsAberto(true)}
        aria-label={`Anexar ao passo ${numero}`}
      >
        <Paperclip /> Anexar
      </Button>
    )
  }

  return (
    <div className="mt-2">
      <PainelAnexos dono={dono} descricaoDono={descricao} />
    </div>
  )
}
