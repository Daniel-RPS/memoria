import { useState, type DragEvent } from 'react'
import { cn } from 'cn'
import { EtapaEntrada } from '@/components/importar/etapa-entrada'
import { EtapaOrigem } from '@/components/importar/etapa-origem'
import { EtapaPrevia } from '@/components/importar/etapa-previa'
import { useImportacao, type EtapaDaImportacao } from '@/components/importar/use-importacao'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { OrigemDaImportacao } from '@/lib/importar/entrada'
import type { ConteudoDoTexto } from '@/lib/importar/markdown'

const ETAPAS: { id: EtapaDaImportacao; rotulo: string }[] = [
  { id: 'origem', rotulo: 'Origem' },
  { id: 'entrada', rotulo: 'Conteúdo' },
  { id: 'previa', rotulo: 'Prévia' },
]

export interface DialogoImportarProps {
  isAberto: boolean
  onMudarAberto: (isAberto: boolean) => void
  /** Já abre com a origem escolhida (ex.: Procedimentos → texto como procedimento). */
  origemInicial?: OrigemDaImportacao
  conteudoInicial?: ConteudoDoTexto
}

/**
 * Importar conteúdo de fora em etapas (origem → texto ou arquivo → prévia → importar), sem
 * substituir nada. Aceita arquivos soltos em qualquer ponto da janela.
 */
export function DialogoImportar({ isAberto, onMudarAberto, ...props }: DialogoImportarProps) {
  return (
    <Dialog open={isAberto} onOpenChange={onMudarAberto}>
      <DialogContent className="flex max-h-[min(44rem,calc(100dvh-2rem))] flex-col gap-0 p-0 sm:max-w-2xl">
        {/* Montado só aberto: fechar e abrir de novo começa do zero. */}
        <ConteudoDaImportacao {...props} onConcluir={() => onMudarAberto(false)} />
      </DialogContent>
    </Dialog>
  )
}

function ConteudoDaImportacao({
  origemInicial,
  conteudoInicial,
  onConcluir,
}: Omit<DialogoImportarProps, 'isAberto' | 'onMudarAberto'> & { onConcluir: () => void }) {
  const importacao = useImportacao({ origemInicial, conteudoInicial, onConcluir })
  const [isArrastandoArquivo, setIsArrastandoArquivo] = useState(false)
  const indiceAtual = ETAPAS.findIndex((etapa) => etapa.id === importacao.etapa)

  function handleDragOver(evento: DragEvent) {
    if (!evento.dataTransfer.types.includes('Files')) return
    evento.preventDefault()
    setIsArrastandoArquivo(true)
  }

  function handleDrop(evento: DragEvent) {
    evento.preventDefault()
    setIsArrastandoArquivo(false)
    void importacao.handleSoltar([...evento.dataTransfer.files])
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={(evento) => {
        if (!evento.currentTarget.contains(evento.relatedTarget as Node | null)) {
          setIsArrastandoArquivo(false)
        }
      }}
      onDrop={handleDrop}
      className="relative flex min-h-0 flex-col"
    >
      <DialogHeader className="border-b border-pauta px-5 pt-5 pb-3">
        <DialogTitle className="text-xl font-bold">Importar</DialogTitle>
        <DialogDescription>
          Traga tarefas, grupos, procedimentos e notas de fora. Nada do que você já tem é apagado.
        </DialogDescription>
        <ol aria-label="Etapas" className="mt-2 flex flex-wrap items-center gap-x-1 text-sm">
          {ETAPAS.map((etapa, indice) => (
            <li
              key={etapa.id}
              aria-current={indice === indiceAtual ? 'step' : undefined}
              className={cn(
                'flex items-center gap-1.5',
                indice === indiceAtual ? 'font-semibold text-tinta' : 'text-grafite',
              )}
            >
              {indice > 0 && <span aria-hidden className="mx-1 h-px w-5 bg-pauta" />}
              <span
                aria-hidden
                className={cn(
                  'flex size-5 items-center justify-center rounded-full border text-xs tabular-nums',
                  indice === indiceAtual
                    ? 'border-caneta bg-caneta text-primary-foreground'
                    : indice < indiceAtual
                      ? 'border-caneta text-violeta-profundo'
                      : 'border-pauta',
                )}
              >
                {indice + 1}
              </span>
              {etapa.rotulo}
            </li>
          ))}
        </ol>
      </DialogHeader>

      {importacao.etapa === 'origem' && <EtapaOrigem importacao={importacao} />}
      {importacao.etapa === 'entrada' && <EtapaEntrada importacao={importacao} />}
      {importacao.etapa === 'previa' && <EtapaPrevia importacao={importacao} />}

      {isArrastandoArquivo && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-2 flex items-center justify-center rounded-lg border-2 border-dashed border-caneta bg-papel/90 text-base font-semibold text-violeta-profundo"
        >
          Solte para ler o arquivo
        </div>
      )}
    </div>
  )
}
