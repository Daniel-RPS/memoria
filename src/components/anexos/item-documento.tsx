import { useState } from 'react'
import { Download, ExternalLink, Trash2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import type { Attachment } from '@/db/types'
import {
  familiaDoDocumento,
  formatarTamanhoBytes,
  siglaDoDocumento,
  tratarNomeArquivo,
  type TipoDocumentoFamilia,
} from '@/domain/attachments'
import { baixarArquivo } from '@/lib/baixar-arquivo'

interface ItemDocumentoProps {
  anexo: Attachment
  onExcluir: () => void
}

const ESTILOS_BADGE: Record<TipoDocumentoFamilia, string> = {
  pdf: 'bg-destructive/15 text-destructive border-destructive/30',
  word: 'bg-caneta/15 text-caneta border-caneta/30',
  excel: 'bg-emerald-600/15 text-emerald-600 dark:text-emerald-400 border-emerald-600/30',
  dwg: 'bg-alerta/15 text-alerta border-alerta/30',
}

/**
 * Linha/cartão compacto para documento anexado (PDF, Word, Excel, DWG).
 */
export function ItemDocumento({ anexo, onExcluir }: ItemDocumentoProps) {
  const [isConfirmandoExclusao, setIsConfirmandoExclusao] = useState(false)

  const familia = familiaDoDocumento(anexo.extensao ?? anexo.nome)
  const sigla = siglaDoDocumento(anexo.extensao ?? anexo.nome)
  const tamanhoFormatado = anexo.tamanho
    ? formatarTamanhoBytes(anexo.tamanho)
    : anexo.blob
      ? formatarTamanhoBytes(anexo.blob.size)
      : ''

  function handleAbrirPdf() {
    if (!anexo.blob) return
    const blobComMime =
      anexo.blob.type === 'application/pdf' ? anexo.blob : new Blob([anexo.blob], { type: 'application/pdf' })
    const url = URL.createObjectURL(blobComMime)
    const aba = window.open(url, '_blank')
    // Revoga a URL temporária quando o navegador tiver tempo de carregar a aba
    setTimeout(() => URL.revokeObjectURL(url), 60000)
    if (!aba) {
      // Bloqueador de pop-up pode ter impedido: faz download como fallback
      handleBaixar()
    }
  }

  function handleBaixar() {
    if (!anexo.blob) return
    const nomeSeguro = tratarNomeArquivo(anexo.nome)
    baixarArquivo(nomeSeguro, anexo.blob)
  }

  return (
    <li className="flex items-center justify-between gap-3 rounded-md border border-pauta bg-papel px-3 py-2 text-sm shadow-xs transition-colors hover:bg-accent/40">
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          className={`flex size-8 shrink-0 items-center justify-center rounded-sm border font-mono text-[0.6875rem] font-bold tracking-tight ${ESTILOS_BADGE[familia]}`}
          aria-hidden="true"
        >
          {sigla}
        </span>
        <div className="min-w-0">
          <p className="truncate font-medium text-tinta" title={anexo.nome}>
            {anexo.nome}
          </p>
          <p className="text-xs text-grafite">
            {tamanhoFormatado && <span>{tamanhoFormatado}</span>}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {familia === 'pdf' ? (
          <>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={handleAbrirPdf}
              title={`Abrir ${anexo.nome}`}
              aria-label={`Abrir ${anexo.nome}`}
              className="text-caneta hover:text-caneta"
            >
              <ExternalLink className="size-3.5" />
              Abrir
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={handleBaixar}
              title={`Baixar ${anexo.nome}`}
              aria-label={`Baixar ${anexo.nome}`}
              className="text-grafite"
            >
              <Download className="size-3.5" />
              Baixar
            </Button>
          </>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={handleBaixar}
            title={`Baixar ${anexo.nome}`}
            aria-label={`Baixar ${anexo.nome}`}
            className="text-caneta hover:text-caneta"
          >
            <Download className="size-3.5" />
            Baixar
          </Button>
        )}

        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={() => setIsConfirmandoExclusao(true)}
          title={`Remover ${anexo.nome}`}
          aria-label={`Remover ${anexo.nome}`}
          className="text-grafite hover:text-destructive"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>

      <AlertDialog open={isConfirmandoExclusao} onOpenChange={setIsConfirmandoExclusao}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover “{anexo.nome}”?</AlertDialogTitle>
            <AlertDialogDescription>
              O documento será removido desta nota. Esta é a única cópia guardada no app.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                setIsConfirmandoExclusao(false)
                onExcluir()
              }}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  )
}
