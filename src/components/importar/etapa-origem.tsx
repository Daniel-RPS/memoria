import { Archive, FileText, NotebookPen, Sheet, type LucideIcon } from 'lucide-react'
import { RodapeDaEtapa } from '@/components/importar/rodape-da-etapa'
import type { useImportacao } from '@/components/importar/use-importacao'
import { ORIGENS, type OrigemDaImportacao } from '@/lib/importar/entrada'
import { TAMANHO_MAXIMO_TEXTO } from '@/lib/importar/rascunho'

const ICONE_DA_ORIGEM: Record<OrigemDaImportacao, LucideIcon> = {
  texto: FileText,
  csv: Sheet,
  keep: NotebookPen,
  memoria: Archive,
}

/** Etapa 1: de onde vem o conteúdo. */
export function EtapaOrigem({ importacao }: { importacao: ReturnType<typeof useImportacao> }) {
  return (
    <>
      <div className="min-h-0 overflow-y-auto px-5 py-4">
        <ul aria-label="Origem" className="grid gap-2 sm:grid-cols-2">
          {(Object.keys(ORIGENS) as OrigemDaImportacao[]).map((origem) => {
            const Icone = ICONE_DA_ORIGEM[origem]
            return (
              <li key={origem}>
                <button
                  type="button"
                  aria-pressed={importacao.origem === origem}
                  onClick={() => importacao.handleEscolherOrigem(origem)}
                  className="flex h-full w-full items-start gap-3 rounded-md border border-pauta bg-papel p-3 text-left outline-none hover:border-caneta hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 aria-pressed:border-caneta"
                >
                  <Icone aria-hidden className="mt-0.5 size-5 shrink-0 text-violeta-profundo" />
                  <span className="flex flex-col gap-0.5">
                    <span className="font-semibold">{ORIGENS[origem].rotulo}</span>
                    <span className="text-sm text-grafite">{ORIGENS[origem].descricao}</span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
        <p className="mt-3 text-sm text-grafite">
          Pode também soltar o arquivo aqui. Os arquivos são lidos só neste navegador, até{' '}
          {TAMANHO_MAXIMO_TEXTO}.
        </p>
      </div>
      <RodapeDaEtapa erro={importacao.erro} />
    </>
  )
}
