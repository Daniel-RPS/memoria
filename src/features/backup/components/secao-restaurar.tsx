import { useRef, useState, type ChangeEvent } from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Download, Upload } from 'lucide-react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { exportarDados, importarDados, versaoDoBanco } from '@/db/repositories/backup-repository'
import { useHoje } from '@/hooks/use-hoje'
import {
  lerBackup,
  nomeDoArquivo,
  quantidadesDoBackup,
  resumirQuantidades,
  type Backup,
} from '@/lib/backup'
import { baixarArquivo } from '@/lib/baixar-arquivo'
import { useDadosAtuais } from '@/features/backup/hooks/use-backup'

interface SecaoRestaurarProps {
  /** Chamado quando o usuário baixa os dados atuais antes de substituí-los. */
  onBackupAntesDeSubstituir: (momento: string) => void
}

interface ArquivoLido {
  nome: string
  backup: Backup
}

/** Escolher um arquivo, ver o que tem nele e substituir os dados atuais. */
export function SecaoRestaurar({ onBackupAntesDeSubstituir }: SecaoRestaurarProps) {
  const hoje = useHoje()
  const atuais = useDadosAtuais()
  const entradaRef = useRef<HTMLInputElement>(null)
  const [lido, setLido] = useState<ArquivoLido | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [isConfirmando, setIsConfirmando] = useState(false)
  const [isImportando, setIsImportando] = useState(false)
  const resumoAtual = atuais ? resumirQuantidades(atuais) : []

  async function handleEscolher(evento: ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0]
    // Limpa o campo para permitir escolher o mesmo arquivo de novo depois.
    evento.target.value = ''
    setLido(null)
    setErro(null)
    if (!arquivo) return
    const resultado = lerBackup(await arquivo.text(), versaoDoBanco())
    if (resultado.isValido) setLido({ nome: arquivo.name, backup: resultado.backup })
    else setErro(resultado.mensagem)
  }

  async function handleBaixarAtuais() {
    const backup = await exportarDados()
    baixarArquivo(nomeDoArquivo(hoje), JSON.stringify(backup))
    onBackupAntesDeSubstituir(backup.exportadoEm)
    toast('Backup dos dados atuais baixado.')
  }

  async function handleSubstituir() {
    if (!lido) return
    setIsImportando(true)
    try {
      await importarDados(lido.backup)
      toast(`Dados restaurados de ${lido.nome}.`)
      setLido(null)
    } catch {
      toast.error('A restauração falhou. Seus dados atuais não foram alterados.')
    } finally {
      setIsImportando(false)
    }
  }

  return (
    <section
      aria-labelledby="titulo-restaurar"
      className="mt-8 rounded-md border border-pauta bg-papel p-4 sm:p-6"
    >
      <h2 id="titulo-restaurar" className="text-xl font-bold">
        Restaurar de um backup
      </h2>
      <p className="mt-2 max-w-prose text-[0.9375rem] text-grafite">
        Restaurar substitui todos os dados deste navegador pelos do arquivo. Antes de aplicar, você
        vê o que tem no arquivo.
      </p>

      <input
        ref={entradaRef}
        type="file"
        accept=".json,application/json"
        aria-label="Arquivo de backup"
        className="sr-only"
        onChange={(evento) => void handleEscolher(evento)}
      />
      <Button variant="outline" className="mt-4" onClick={() => entradaRef.current?.click()}>
        <Upload /> Escolher arquivo de backup
      </Button>

      {erro && (
        <p
          role="alert"
          className="mt-4 rounded-md border-l-4 border-l-destructive bg-destructive/5 px-3 py-2"
        >
          {erro}
        </p>
      )}

      {lido && (
        <div className="mt-4 rounded-md border border-pauta p-4" aria-live="polite">
          <p className="font-semibold">{lido.nome}</p>
          <p className="text-sm text-grafite">
            Feito em{' '}
            {format(parseISO(lido.backup.exportadoEm), "d 'de' MMMM 'de' yyyy, HH:mm", {
              locale: ptBR,
            })}
          </p>
          <dl className="mt-3 grid gap-x-4 gap-y-1 text-[0.9375rem] sm:grid-cols-[auto_1fr]">
            <dt className="text-grafite">No arquivo</dt>
            <dd>
              {resumirQuantidades(quantidadesDoBackup(lido.backup)).join(', ') || 'nenhum dado'}
            </dd>
            <dt className="text-grafite">Agora</dt>
            <dd>{resumoAtual.join(', ') || 'nenhum dado'}</dd>
          </dl>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void handleBaixarAtuais()}>
              <Download /> Baixar backup dos dados atuais
            </Button>
            <Button
              variant="destructive"
              onClick={() => setIsConfirmando(true)}
              disabled={isImportando}
            >
              Substituir meus dados
            </Button>
            <Button variant="ghost" onClick={() => setLido(null)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      <AlertDialog open={isConfirmando} onOpenChange={setIsConfirmando}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Substituir todos os dados?</AlertDialogTitle>
            <AlertDialogDescription>
              Tudo o que existe agora neste navegador será trocado pelo conteúdo de {lido?.nome}. Se
              ainda não baixou um backup dos dados atuais, cancele e baixe antes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => void handleSubstituir()}>
              Substituir dados
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
