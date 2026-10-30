import { useState } from 'react'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Download, ShieldAlert, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { exportarDados } from '@/db/repositories/backup-repository'
import { useHoje } from '@/hooks/use-hoje'
import { resumirQuantidades, nomeDoArquivo } from '@/lib/backup'
import { baixarArquivo } from '@/lib/baixar-arquivo'
import { useArmazenamento, useDadosAtuais } from '@/features/backup/hooks/use-backup'

interface SecaoExportarProps {
  ultimoBackup: string | null
  onExportado: (momento: string) => void
}

const BYTES_POR_MB = 1024 * 1024

/** Situação dos dados e o botão para baixar o backup. */
export function SecaoExportar({ ultimoBackup, onExportado }: SecaoExportarProps) {
  const hoje = useHoje()
  const quantidades = useDadosAtuais()
  const { estado, pedirPersistencia } = useArmazenamento()
  const [isExportando, setIsExportando] = useState(false)
  const resumo = quantidades ? resumirQuantidades(quantidades) : []

  async function handleBaixar() {
    setIsExportando(true)
    try {
      const backup = await exportarDados()
      const nome = nomeDoArquivo(hoje)
      baixarArquivo(nome, JSON.stringify(backup))
      onExportado(backup.exportadoEm)
      toast(`Backup baixado: ${nome}`)
    } catch {
      toast.error('Não foi possível gerar o backup. Tente de novo.')
    } finally {
      setIsExportando(false)
    }
  }

  return (
    <section
      aria-labelledby="titulo-exportar"
      className="mt-8 rounded-md border border-pauta bg-papel p-4 sm:p-6"
    >
      <h2 id="titulo-exportar" className="text-xl font-bold">
        Fazer backup
      </h2>
      <p className="mt-2">
        {resumo.length > 0 ? `Agora você tem ${resumo.join(', ')}.` : 'Ainda não há dados.'}
      </p>
      <p className="mt-1 text-[0.9375rem] text-grafite">
        {ultimoBackup
          ? `Último backup neste navegador: ${formatDistanceToNow(parseISO(ultimoBackup), { addSuffix: true, locale: ptBR })}.`
          : 'Nenhum backup feito neste navegador.'}
      </p>
      <Button className="mt-4" onClick={() => void handleBaixar()} disabled={isExportando}>
        <Download /> Baixar backup
      </Button>

      {estado && (
        <div className="mt-6 flex gap-2 border-t border-pauta pt-4 text-[0.9375rem]">
          {estado.isPersistente ? (
            <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-caneta" />
          ) : (
            <ShieldAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
          )}
          <div>
            <p>
              {estado.isPersistente
                ? 'O navegador garantiu que não apaga estes dados sozinho.'
                : 'O navegador pode apagar estes dados se faltar espaço em disco.'}
              {estado.usadoBytes !== undefined &&
                ` Uso atual: ${(estado.usadoBytes / BYTES_POR_MB).toFixed(1)} MB.`}
            </p>
            {!estado.isPersistente && (
              <Button
                variant="link"
                className="h-auto p-0"
                onClick={() => void pedirPersistencia()}
              >
                Pedir ao navegador para guardar
              </Button>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
