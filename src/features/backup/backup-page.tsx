import { CabecalhoPagina } from '@/components/cabecalho-pagina'
import { SecaoExportar } from '@/features/backup/components/secao-exportar'
import { SecaoRestaurar } from '@/features/backup/components/secao-restaurar'
import { useUltimoBackup } from '@/features/backup/hooks/use-backup'

export function BackupPage() {
  const ultimoBackup = useUltimoBackup()

  return (
    <>
      <CabecalhoPagina
        titulo="Backup"
        descricao="Seus dados ficam só neste navegador. Limpar os dados do site, trocar de navegador ou de computador apaga tudo, a menos que você tenha um backup. Guarde o arquivo fora do computador, como num pendrive ou na nuvem."
      />
      <SecaoExportar ultimoBackup={ultimoBackup.ultimo} onExportado={ultimoBackup.registrar} />
      <SecaoRestaurar onBackupAntesDeSubstituir={ultimoBackup.registrar} />
    </>
  )
}
