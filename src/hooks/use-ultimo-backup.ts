import { useSyncExternalStore } from 'react'
import { gravarPreferencia, lerPreferencia } from '@/app/preferencia-local'

const CHAVE_ULTIMO_BACKUP = 'memoria:ultimo-backup'

// A tela de Backup grava e a barra lateral lê ao mesmo tempo: os dois ouvem a mesma lista.
const ouvintes = new Set<() => void>()

function assinar(ouvinte: () => void) {
  ouvintes.add(ouvinte)
  // Backup feito em outra aba também conta.
  window.addEventListener('storage', ouvinte)
  return () => {
    ouvintes.delete(ouvinte)
    window.removeEventListener('storage', ouvinte)
  }
}

function lerUltimoBackup() {
  return lerPreferencia(CHAVE_ULTIMO_BACKUP)
}

function registrar(momento: string) {
  gravarPreferencia(CHAVE_ULTIMO_BACKUP, momento)
  for (const ouvinte of ouvintes) ouvinte()
}

/** Quando foi baixado o último backup neste navegador (ISO), lembrado entre visitas. */
export function useUltimoBackup() {
  const ultimo = useSyncExternalStore(assinar, lerUltimoBackup, () => null)
  return { ultimo, registrar }
}
