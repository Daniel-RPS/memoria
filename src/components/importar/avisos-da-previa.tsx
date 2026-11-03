import { TriangleAlert } from 'lucide-react'

/** Linhas que não deram para entender e o que ficou de fora de propósito; não travam o resto. */
export function AvisosDaPrevia({ avisos, ignorados }: { avisos: string[]; ignorados: string[] }) {
  if (avisos.length === 0 && ignorados.length === 0) return null
  return (
    <div className="flex flex-col gap-2">
      {avisos.length > 0 && (
        <details
          className="rounded-md border border-pauta bg-papel px-3 py-2"
          open={avisos.length <= 3}
        >
          <summary className="flex cursor-pointer items-center gap-1.5 text-sm font-semibold">
            <TriangleAlert aria-hidden className="size-4 text-alerta" />
            {avisos.length === 1 ? '1 aviso' : `${avisos.length} avisos`}
          </summary>
          <ul className="mt-1.5 flex list-disc flex-col gap-0.5 pl-5 text-sm text-grafite">
            {avisos.map((aviso, indice) => (
              <li key={indice}>{aviso}</li>
            ))}
          </ul>
        </details>
      )}
      {ignorados.length > 0 && (
        <details className="rounded-md border border-pauta bg-papel px-3 py-2">
          <summary className="cursor-pointer text-sm font-semibold">
            {ignorados.length === 1 ? '1 ignorado' : `${ignorados.length} ignorados`}
          </summary>
          <ul className="mt-1.5 flex list-disc flex-col gap-0.5 pl-5 text-sm text-grafite">
            {ignorados.map((ignorado, indice) => (
              <li key={indice}>{ignorado}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}
