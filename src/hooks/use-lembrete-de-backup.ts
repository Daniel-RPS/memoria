import { useLiveQuery } from 'dexie-react-hooks'
import { contarDados } from '@/db/repositories/backup-repository'
import { useHoje } from '@/hooks/use-hoje'
import { useUltimoBackup } from '@/hooks/use-ultimo-backup'
import { DIAS_PARA_LEMBRAR_BACKUP, isBackupAtrasado } from '@/lib/backup'

/** Texto do lembrete quando há dados sem backup recente; `undefined` quando está em dia. */
export function useLembreteDeBackup() {
  const dataHoje = useHoje()
  const { ultimo } = useUltimoBackup()
  const quantidades = useLiveQuery(contarDados, [])
  const hasDados = Object.values(quantidades ?? {}).some((total) => total > 0)
  if (!isBackupAtrasado(ultimo, dataHoje, hasDados)) return undefined
  return ultimo
    ? `Último backup há mais de ${DIAS_PARA_LEMBRAR_BACKUP} dias`
    : 'Nenhum backup feito neste navegador'
}
