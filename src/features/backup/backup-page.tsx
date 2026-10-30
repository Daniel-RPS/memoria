import { SecaoExportar } from '@/features/backup/components/secao-exportar'
import { SecaoRestaurar } from '@/features/backup/components/secao-restaurar'
import { useUltimoBackup } from '@/features/backup/hooks/use-backup'

export function BackupPage() {
  const ultimoBackup = useUltimoBackup()

  return (
    <>
      <h1 className="text-4xl font-extrabold tracking-[-0.02em] [font-stretch:80%]">Backup</h1>
      <p className="mt-2 max-w-prose text-grafite">
        Seus dados ficam só neste navegador. Limpar os dados do site, trocar de navegador ou de
        computador apaga tudo, a menos que você tenha um backup. Guarde o arquivo fora do
        computador, como num pendrive ou na nuvem.
      </p>
      <SecaoExportar ultimoBackup={ultimoBackup.ultimo} onExportado={ultimoBackup.registrar} />
      <SecaoRestaurar onBackupAntesDeSubstituir={ultimoBackup.registrar} />
    </>
  )
}
