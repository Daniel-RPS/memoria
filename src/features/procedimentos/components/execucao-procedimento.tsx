import { useState } from 'react'
import { toast } from 'sonner'
import { Link, useNavigate } from 'react-router'
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
import { Field, FieldLabel } from '@/components/ui/field'
import { Textarea } from '@/components/ui/textarea'
import {
  atualizarExecucao,
  concluirExecucao,
  descartarExecucao,
  mudarEstadoDoPasso,
} from '@/db/repositories/execution-repository'
import type { Execution, Procedure } from '@/db/types'
import { progressoExecucao } from '@/lib/procedimentos'
import { useSalvarComAtraso } from '@/hooks/use-salvar-com-atraso'
import { CamposExecucao } from '@/features/procedimentos/components/campos-execucao'
import { PassoExecucao } from '@/features/procedimentos/components/passo-execucao'

interface ExecucaoProcedimentoProps {
  execucao: Execution
  /** O procedimento na versão em que a execução começou. */
  procedimento: Procedure
}

type Confirmacao = 'concluir' | 'descartar' | null

/**
 * Checklist da execução. Tudo o que muda aqui é gravado SÓ na execução:
 * o procedimento (modelo) nunca é alterado.
 */
export function ExecucaoProcedimento({ execucao, procedimento }: ExecucaoProcedimentoProps) {
  const navigate = useNavigate()
  const [confirmacao, setConfirmacao] = useState<Confirmacao>(null)
  const valores = useSalvarComAtraso(execucao.valoresCampos, (valoresCampos) =>
    atualizarExecucao(execucao.id, { valoresCampos }),
  )
  const observacoes = useSalvarComAtraso(execucao.observacoes, (texto) =>
    atualizarExecucao(execucao.id, { observacoes: texto }),
  )
  const progresso = progressoExecucao(procedimento, execucao)
  const restantes = progresso.total - progresso.feitos - progresso.pulados
  const voltarPara = `/procedimentos/${procedimento.id}`
  // Numeração contínua entre seções: o primeiro passo de cada seção segue a anterior.
  const primeiroNumeroDaSecao = procedimento.secoes.map((_, indice) =>
    procedimento.secoes.slice(0, indice).reduce((total, secao) => total + secao.passos.length, 1),
  )

  function handleMudarPasso(passoId: string, estado: 'feito' | 'pulado' | 'pendente') {
    void mudarEstadoDoPasso(execucao.id, passoId, estado)
  }

  async function handleConcluir() {
    await valores.salvarAgora()
    await observacoes.salvarAgora()
    await concluirExecucao(execucao.id)
    toast(
      execucao.taskId
        ? 'Execução concluída e registrada. A tarefa do calendário também foi concluída.'
        : 'Execução concluída e registrada no histórico.',
    )
    navigate(voltarPara)
  }

  async function handleDescartar() {
    await descartarExecucao(execucao.id)
    navigate(voltarPara)
  }

  return (
    <>
      <Link to={voltarPara} className="text-sm text-grafite hover:text-tinta">
        {procedimento.titulo}
      </Link>
      <h1 className="mt-1 text-4xl font-extrabold tracking-[-0.02em] [font-stretch:80%]">
        Executando
      </h1>
      <p className="mt-2 max-w-prose text-grafite">
        Versão {execucao.versao}. Marque cada passo ao terminar. O que você preencher aqui fica só
        nesta execução; o procedimento não muda.
      </p>

      <CamposExecucao
        campos={procedimento.camposVariaveis}
        valores={valores.valor}
        onMudar={valores.mudar}
      />

      <div className="mt-8 flex flex-col gap-8">
        {procedimento.secoes.map((secao, indiceSecao) => (
          <section key={secao.id} aria-label={secao.titulo}>
            <h2 className="text-xl font-bold">{secao.titulo}</h2>
            <ol className="mt-3 flex flex-col gap-3">
              {secao.passos.map((passo, indicePasso) => {
                return (
                  <PassoExecucao
                    key={passo.id}
                    numero={primeiroNumeroDaSecao[indiceSecao] + indicePasso}
                    passo={passo}
                    campos={procedimento.camposVariaveis}
                    valores={valores.valor}
                    estado={
                      execucao.passosMarcados.includes(passo.id)
                        ? 'feito'
                        : execucao.passosPulados.includes(passo.id)
                          ? 'pulado'
                          : 'pendente'
                    }
                    onMudar={(estado) => handleMudarPasso(passo.id, estado)}
                  />
                )
              })}
            </ol>
          </section>
        ))}
      </div>

      <Field className="mt-8">
        <FieldLabel htmlFor="observacoes">Observações desta execução</FieldLabel>
        <Textarea
          id="observacoes"
          rows={3}
          value={observacoes.valor}
          onChange={(evento) => observacoes.mudar(evento.target.value)}
          placeholder="O que foi diferente desta vez, problemas, números de chamado…"
          className="bg-papel"
        />
      </Field>

      <div
        role="region"
        aria-label="Progresso da execução"
        className="sticky bottom-4 z-10 mt-8 flex flex-wrap items-center gap-3 rounded-md border border-tinta/20 bg-tinta px-4 py-3 text-papel shadow-lg"
      >
        <p aria-live="polite" className="mr-auto text-sm">
          <strong className="text-base">
            {progresso.feitos} de {progresso.total}
          </strong>{' '}
          feitos{progresso.pulados > 0 && `, ${progresso.pulados} pulados`}
        </p>
        <Button
          variant="ghost"
          className="text-papel hover:bg-papel/15 hover:text-papel"
          onClick={() => setConfirmacao('descartar')}
        >
          Descartar
        </Button>
        <Button
          variant="secondary"
          onClick={() => (restantes > 0 ? setConfirmacao('concluir') : void handleConcluir())}
        >
          Concluir execução
        </Button>
      </div>

      <AlertDialog
        open={confirmacao !== null}
        onOpenChange={(isAberto) => !isAberto && setConfirmacao(null)}
      >
        <AlertDialogContent>
          {confirmacao === 'concluir' ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {restantes === 1 ? 'Falta 1 passo' : `Faltam ${restantes} passos`}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Eles ficam registrados como não feitos. Concluir a execução mesmo assim?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Voltar</AlertDialogCancel>
                <AlertDialogAction onClick={() => void handleConcluir()}>
                  Concluir execução
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          ) : (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Descartar esta execução?</AlertDialogTitle>
                <AlertDialogDescription>
                  O que foi marcado e preenchido será apagado e não entra no histórico.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Voltar</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={() => void handleDescartar()}>
                  Descartar execução
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
