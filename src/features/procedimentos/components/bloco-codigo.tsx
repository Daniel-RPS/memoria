import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { CampoVariavel } from '@/db/types'
import { substituirCampos } from '@/lib/procedimentos'
import { TextoComCampos } from '@/features/procedimentos/components/texto-com-campos'

interface BlocoCodigoProps {
  codigo: string
  campos: CampoVariavel[]
  valores?: Record<string, string>
}

/** Tempo que o botão mostra "Copiado" antes de voltar ao normal. */
const TEMPO_CONFIRMACAO_MS = 1500

/** Código do passo, com os campos já trocados e um botão para copiar. */
export function BlocoCodigo({ codigo, campos, valores = {} }: BlocoCodigoProps) {
  const [isCopiado, setIsCopiado] = useState(false)

  async function handleCopiar() {
    await navigator.clipboard.writeText(substituirCampos(codigo, campos, valores))
    setIsCopiado(true)
    window.setTimeout(() => setIsCopiado(false), TEMPO_CONFIRMACAO_MS)
  }

  return (
    <div className="relative mt-2 rounded-md bg-tinta text-papel">
      <pre className="overflow-x-auto p-3 pr-12 font-mono text-sm leading-relaxed">
        <code>
          <TextoComCampos texto={codigo} campos={campos} valores={valores} />
        </code>
      </pre>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => void handleCopiar()}
        aria-label={isCopiado ? 'Código copiado' : 'Copiar código'}
        className="absolute top-2 right-2 text-papel hover:bg-papel/15 hover:text-papel"
      >
        {isCopiado ? <Check /> : <Copy />}
      </Button>
    </div>
  )
}
