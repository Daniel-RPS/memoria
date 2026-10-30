import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { contarDados } from '@/db/repositories/backup-repository'
import { solicitarArmazenamentoPersistente } from '@/lib/armazenamento'

const CHAVE_ULTIMO_BACKUP = 'memoria:ultimo-backup'

/** Quantos registros há agora em cada tabela (`undefined` enquanto conta). */
export function useDadosAtuais() {
  return useLiveQuery(contarDados, [])
}

function lerUltimoBackup() {
  try {
    return window.localStorage.getItem(CHAVE_ULTIMO_BACKUP)
  } catch {
    return null
  }
}

/** Quando foi baixado o último backup neste navegador (ISO), lembrado entre visitas. */
export function useUltimoBackup() {
  const [ultimo, setUltimo] = useState(lerUltimoBackup)

  function registrar(momento: string) {
    setUltimo(momento)
    try {
      window.localStorage.setItem(CHAVE_ULTIMO_BACKUP, momento)
    } catch {
      // Sem localStorage, a lembrança vale só nesta visita.
    }
  }

  return { ultimo, registrar }
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
