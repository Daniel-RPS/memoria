import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { listarAnexos } from '@/db/repositories/attachment-repository'
import type { Attachment, Dono } from '@/db/types'

const NENHUM: Attachment[] = []

/** Anexos de um dono, atualizados sozinhos. */
export function useAnexos(dono: Dono) {
  const anexos = useLiveQuery(() => listarAnexos(dono), [dono.tipo, dono.id])
  return anexos ?? NENHUM
}

/** URL temporária para mostrar um blob (imagem, áudio); liberada ao sair da tela. */
export function useUrlDoBlob(blob: Blob | undefined) {
  const [url, setUrl] = useState<string>()

  useEffect(() => {
    if (!blob) return
    const criada = URL.createObjectURL(blob)
    // Sincroniza com um recurso externo (a URL do blob), criado e liberado aqui. Com useMemo,
    // o modo estrito do React liberaria a URL na limpeza da montagem e a imagem quebraria.
    // oxlint-disable-next-line react/set-state-in-effect
    setUrl(criada)
    return () => {
      URL.revokeObjectURL(criada)
      setUrl(undefined)
    }
  }, [blob])

  return url
}
