import type { ReactNode } from 'react'

interface RodapeDaEtapaProps {
  erro: string | null
  /** Botões (Voltar, Continuar, Importar), alinhados à direita. */
  children?: ReactNode
}

/** Rodapé fixo do diálogo de importação: erro da etapa e os botões. */
export function RodapeDaEtapa({ erro, children }: RodapeDaEtapaProps) {
  if (!erro && !children) return null
  return (
    <div className="flex flex-col gap-2 border-t border-pauta px-5 py-3">
      {erro && (
        <p
          role="alert"
          className="rounded-md border-l-4 border-l-destructive bg-destructive/5 px-3 py-2 text-sm"
        >
          {erro}
        </p>
      )}
      {children && <div className="flex flex-wrap justify-end gap-2">{children}</div>}
    </div>
  )
}
