import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { contarDados } from '@/db/repositories/backup-repository'
import { solicitarArmazenamentoPersistente } from '@/lib/armazenamento'

/** Quantos registros há agora em cada tabela (`undefined` enquanto conta). */
export function useDadosAtuais() {
  return useLiveQuery(contarDados, [])
}

export interface EstadoArmazenamento {
  /** `true` quando o navegador garante que não apaga os dados sozinho. */
  isPersistente: boolean
  usadoBytes?: number
}

async function lerArmazenamento(): Promise<EstadoArmazenamento> {
  const isPersistente = (await navigator.storage?.persisted?.()) ?? false
  const estimativa = await navigator.storage?.estimate?.()
  return { isPersistente, usadoBytes: estimativa?.usage }
}

/** Situação do armazenamento local, com a opção de pedir persistência de novo. */
export function useArmazenamento() {
  const [estado, setEstado] = useState<EstadoArmazenamento | null>(null)

  useEffect(() => {
    let isAtivo = true
    void lerArmazenamento().then((lido) => {
      if (isAtivo) setEstado(lido)
    })
    return () => {
      isAtivo = false
    }
  }, [])

  async function pedirPersistencia() {
    await solicitarArmazenamentoPersistente()
    setEstado(await lerArmazenamento())
  }

  return { estado, pedirPersistencia }
}
