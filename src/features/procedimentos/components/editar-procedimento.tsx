import { useState } from 'react'
import { Archive, Star, StickyNote, Trash2 } from 'lucide-react'
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  alternarFavoritoProcedimento,
  excluirProcedimento,
  salvarProcedimento,
} from '@/db/repositories/procedure-repository'
import { useAcoesDeArquivo } from '@/hooks/use-acoes-de-arquivo'
import { usePainelDeNotas, useQuantasNotas } from '@/hooks/contexto-painel-notas'
import { useSalvarComAtraso } from '@/hooks/use-salvar-com-atraso'
import type { DadosProcedimento, ValoresProcedimento } from '@/lib/esquema-procedimento'
import { avisoNotasAvulsas, textoQuantasNotas, vinculoDoProcedimento } from '@/lib/notas'
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
  const { arquivarComAviso } = useAcoesDeArquivo()
  const [isConfirmandoExclusao, setIsConfirmandoExclusao] = useState(false)
  const vinculo = vinculoDoProcedimento({ id })
  const quantasNotas = useQuantasNotas(vinculo)
  const { abrir: abrirNotas } = usePainelDeNotas()
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

  async function handleArquivar() {
    await salvarAgora()
    await arquivarComAviso({ procedimentos: [id] }, ['procedimento'])
    navigate('/procedimentos', { replace: true })
  }

  return (
    <>
      <FormularioProcedimento
        valoresIniciais={valoresIniciais}
        onAlterar={mudar}
        situacao={
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={valoresIniciais.favorito ? 'Remover dos favoritos' : 'Favoritar'}
                  onClick={() => void alternarFavoritoProcedimento(id)}
                  className="text-grafite hover:text-amber-500 focus-visible:text-amber-500"
                >
                  <Star
                    className={
                      valoresIniciais.favorito
                        ? 'fill-amber-500 text-amber-500'
                        : 'text-grafite'
                    }
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {valoresIniciais.favorito ? 'Remover dos favoritos' : 'Favoritar'}
              </TooltipContent>
            </Tooltip>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-grafite tabular-nums"
              aria-label={quantasNotas > 0 ? `Notas: ${textoQuantasNotas(quantasNotas)}` : 'Notas'}
              onClick={() => void abrirNotas(vinculo)}
            >
              <StickyNote /> Notas{quantasNotas > 0 && ` ${quantasNotas}`}
            </Button>
            <p role="status" className="text-sm text-grafite">
              {isPendente ? 'Salvando…' : 'Salvo'}
            </p>
          </div>
        }
        rodape={
          <div className="-mt-2 flex flex-wrap gap-2 border-t border-pauta pt-2">
            <Button
              type="button"
              variant="ghost"
              className="text-grafite"
              onClick={() => void handleArquivar()}
            >
              <Archive /> Arquivar procedimento
            </Button>
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
              {quantasNotas > 0 && ` ${avisoNotasAvulsas(quantasNotas, 'procedimento')}`}
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
