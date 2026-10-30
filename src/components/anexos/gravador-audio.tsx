import { Mic, Square, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { isGravacaoSuportada, useGravadorAudio } from '@/hooks/use-gravador-audio'
import { formatarDuracao } from '@/lib/anexos'

interface GravadorAudioProps {
  onGravado: (audio: Blob) => Promise<unknown>
  onFechar: () => void
}

/** Grava um áudio do microfone; ao parar, o áudio vira anexo. */
export function GravadorAudio({ onGravado, onFechar }: GravadorAudioProps) {
  const { estado, segundos, erro, iniciar, parar, cancelar } = useGravadorAudio((audio) => {
    void onGravado(audio).then(onFechar)
  })

  if (!isGravacaoSuportada()) {
    return (
      <p role="status" className="rounded-md bg-muted px-3 py-2 text-[0.9375rem]">
        Este navegador não permite gravar áudio.
        <Button variant="link" className="ml-1 h-auto p-0" onClick={onFechar}>
          Fechar
        </Button>
      </p>
    )
  }

  return (
    <div
      role="group"
      aria-label="Gravar áudio"
      className="flex flex-wrap items-center gap-3 rounded-md border border-pauta bg-papel px-3 py-2"
    >
      {estado === 'gravando' ? (
        <>
          <span className="flex items-center gap-2 font-semibold tabular-nums" aria-live="off">
            <span
              aria-hidden
              className="size-2.5 animate-pulse rounded-full bg-destructive motion-reduce:animate-none"
            />
            Gravando {formatarDuracao(segundos)}
          </span>
          <Button size="sm" onClick={parar}>
            <Square /> Parar e salvar
          </Button>
          <Button size="sm" variant="ghost" onClick={cancelar}>
            Descartar
          </Button>
        </>
      ) : (
        <>
          <Button size="sm" onClick={() => void iniciar()} disabled={estado === 'pedindo'}>
            <Mic /> {estado === 'pedindo' ? 'Aguardando o microfone…' : 'Começar a gravar'}
          </Button>
          <Button size="icon-sm" variant="ghost" aria-label="Fechar gravador" onClick={onFechar}>
            <X />
          </Button>
        </>
      )}
      {erro && (
        <p role="alert" className="w-full text-sm text-destructive">
          {erro}
        </p>
      )}
    </div>
  )
}
