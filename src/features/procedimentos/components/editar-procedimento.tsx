import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router'
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
import { excluirProcedimento, salvarProcedimento } from '@/db/repositories/procedure-repository'
import { useSalvarComAtraso } from '@/hooks/use-salvar-com-atraso'
import type { DadosProcedimento, ValoresProcedimento } from '@/lib/esquema-procedimento'
import { FormularioProcedimento } from '@/features/procedimentos/components/formulario-procedimento'

interface EditarProcedimentoProps {
  id: string
  /** Título gravado, para a confirmação de exclusão. */
  titulo: string
  valoresIniciais: ValoresProcedimento
}

/** Formulário que grava sozinho cada mudança válida, e a exclusão com confirmação. */
export function EditarProcedimento({ id, titulo, valoresIniciais }: EditarProcedimentoProps) {
  const navigate = useNavigate()
  const [isConfirmandoExclusao, setIsConfirmandoExclusao] = useState(false)
  const { mudar, isPendente, salvarAgora } = useSalvarComAtraso<DadosProcedimento | null>(
    null,
    async (dados) => {
      if (dados) await salvarProcedimento(id, dados)
    },
  )

  async function handleExcluir() {
    // Grava antes o que estiver pendente: ao sair da tela não sobra nada para gravar.
    await salvarAgora()
    await excluirProcedimento(id)
    navigate('/procedimentos', { replace: true })
  }

  return (
    <>
      <FormularioProcedimento
        valoresIniciais={valoresIniciais}
        onAlterar={mudar}
        situacao={
          <p role="status" className="pb-2 text-sm text-grafite">
            {isPendente ? 'Salvando…' : 'Salvo'}
          </p>
        }
        rodape={
          <div className="border-t border-pauta pt-4">
            <Button
              type="button"
              variant="ghost"
              className="text-grafite"
              onClick={() => setIsConfirmandoExclusao(true)}
            >
              <Trash2 /> Excluir procedimento…
            </Button>
          </div>
        }
      />

      <AlertDialog open={isConfirmandoExclusao} onOpenChange={setIsConfirmandoExclusao}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir “{titulo}”?</AlertDialogTitle>
            <AlertDialogDescription>
              O procedimento e todas as etapas serão apagados de vez.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => void handleExcluir()}>
              Excluir procedimento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
