import { useState } from 'react'
import { ExternalLink, Pencil, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import type { Attachment } from '@/db/types'
import { useUrlDoBlob } from '@/hooks/use-anexos'
import { nomeDoLink } from '@/lib/anexos'

interface ItemAnexoProps {
  anexo: Attachment
  onExcluir: () => void
  onEditarDesenho: () => void
}

/** Um anexo: miniatura (foto/desenho), player (áudio) ou link. */
export function ItemAnexo({ anexo, onExcluir, onEditarDesenho }: ItemAnexoProps) {
  const url = useUrlDoBlob(anexo.blob)
  const [isAmpliado, setIsAmpliado] = useState(false)
  const isImagem = anexo.tipo === 'foto' || anexo.tipo === 'desenho'

  const botaoExcluir = (
    <Button
      variant="ghost"
      size="icon-xs"
      aria-label={`Excluir ${anexo.nome}`}
      onClick={onExcluir}
      className="text-grafite"
    >
      <X />
    </Button>
  )

  if (isImagem) {
    return (
      <li className="group/anexo relative w-32">
        <button
          type="button"
          onClick={() => setIsAmpliado(true)}
          aria-label={`Ampliar ${anexo.nome}`}
          className="block aspect-square w-full overflow-hidden rounded-md border border-pauta bg-white focus-visible:outline-2 focus-visible:outline-caneta"
        >
          {url && <img src={url} alt="" className="size-full object-cover" />}
        </button>
        <div className="mt-1 flex items-center gap-1">
          <span className="min-w-0 flex-1 truncate text-xs text-grafite">{anexo.nome}</span>
          {anexo.tipo === 'desenho' && (
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={`Editar ${anexo.nome}`}
              onClick={onEditarDesenho}
              className="text-grafite"
            >
              <Pencil />
            </Button>
          )}
          {botaoExcluir}
        </div>
        <Dialog open={isAmpliado} onOpenChange={setIsAmpliado}>
          <DialogContent className="w-auto max-w-[calc(100%-2rem)] sm:max-w-[min(90vw,80rem)]">
            <DialogTitle>{anexo.nome}</DialogTitle>
            {url && (
              <img
                src={url}
                alt={anexo.nome}
                className="max-h-[80dvh] w-auto rounded-md object-contain"
              />
            )}
          </DialogContent>
        </Dialog>
      </li>
    )
  }

  if (anexo.tipo === 'audio') {
    return (
      <li className="flex w-full items-center gap-2">
        <span className="min-w-0 shrink-0 text-sm">{anexo.nome}</span>
        {url && <audio controls src={url} className="h-9 min-w-0 flex-1" aria-label={anexo.nome} />}
        {botaoExcluir}
      </li>
    )
  }

  return (
    <li className="flex w-full items-center gap-2">
      <a
        href={anexo.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex min-w-0 items-center gap-1.5 text-caneta underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-caneta"
      >
        <ExternalLink aria-hidden className="size-4 shrink-0" />
        <span className="truncate">{anexo.nome || nomeDoLink(anexo.url ?? '')}</span>
        <span className="sr-only">(abre em outra aba)</span>
      </a>
      {botaoExcluir}
    </li>
  )
}
