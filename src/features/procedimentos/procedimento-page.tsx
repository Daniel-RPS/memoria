import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { CalendarPlus, LockKeyhole, Pencil, Play, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import { DialogoEscolherDia } from '@/components/dialogo-escolher-dia'
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
import { obterExecucaoEmAndamento } from '@/db/repositories/execution-repository'
import { excluirProcedimento } from '@/db/repositories/procedure-repository'
import { agendarProcedimento } from '@/db/repositories/task-repository'
import { useCategorias } from '@/hooks/use-categorias'
import { useHoje } from '@/hooks/use-hoje'
import { classificarTarefa } from '@/lib/categorias'
import { nomeDoDia } from '@/lib/mover'
import { textoCredencial } from '@/lib/procedimentos'
import { ConteudoProcedimento } from '@/features/procedimentos/components/conteudo-procedimento'
import { HistoricoProcedimento } from '@/features/procedimentos/components/historico-procedimento'
import { useProcedimento } from '@/features/procedimentos/hooks/use-procedimentos'

const NOMES_DOS_TIPOS = { texto: 'texto', numero: 'número', data: 'data', credencial: '' }

export function ProcedimentoPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const hoje = useHoje()
  const { procedimento, isCarregando } = useProcedimento(id)
  const { categorias } = useCategorias()
  // Execução começada fora de uma tarefa e ainda não concluída.
  const emAndamento = useLiveQuery(() => obterExecucaoEmAndamento(id), [id])
  const [isAgendando, setIsAgendando] = useState(false)
  const [isConfirmandoExclusao, setIsConfirmandoExclusao] = useState(false)

  if (isCarregando) return null
  if (!procedimento) return <Navigate to="/procedimentos" replace />

  const classificacao = classificarTarefa(procedimento, categorias)

  async function handleAgendar(data: string) {
    await agendarProcedimento(procedimento!, data)
    toast(`Agendado para ${nomeDoDia(data, hoje)}`, {
      action: { label: 'Ver o dia', onClick: () => navigate(`/dia/${data}`) },
    })
  }

  async function handleExcluir() {
    await excluirProcedimento(id)
    navigate('/procedimentos')
  }

  return (
    <>
      <Link to="/procedimentos" className="text-sm text-grafite hover:text-tinta">
        Procedimentos
      </Link>
      <h1 className="mt-1 text-4xl font-extrabold tracking-[-0.02em] [font-stretch:80%]">
        {procedimento.titulo}
      </h1>
      <p className="mt-2 flex flex-wrap gap-x-3 text-sm text-grafite">
        {classificacao && (
          <span className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="size-2.5 rounded-full"
              style={{ backgroundColor: classificacao.cor }}
            />
            {classificacao.rotulo}
          </span>
        )}
        <span>Versão {procedimento.versao}</span>
      </p>
      {procedimento.descricao && (
        <p className="mt-4 max-w-prose whitespace-pre-wrap">{procedimento.descricao}</p>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        <Button asChild>
          <Link to={`/procedimentos/${id}/executar`}>
            <Play /> {emAndamento ? 'Continuar execução' : 'Executar'}
          </Link>
        </Button>
        <Button variant="outline" onClick={() => setIsAgendando(true)}>
          <CalendarPlus /> Agendar
        </Button>
        <Button asChild variant="outline">
          <Link to={`/procedimentos/${id}/editar`}>
            <Pencil /> Editar
          </Link>
        </Button>
        <Button
          variant="ghost"
          className="text-grafite"
          onClick={() => setIsConfirmandoExclusao(true)}
        >
          <Trash2 /> Excluir…
        </Button>
      </div>

      {procedimento.camposVariaveis.length > 0 && (
        <section aria-labelledby="titulo-campos" className="mt-8">
          <h2 id="titulo-campos" className="text-sm font-semibold text-grafite">
            Preenchido a cada execução
          </h2>
          <ul className="mt-2 flex flex-wrap gap-2">
            {procedimento.camposVariaveis.map((campo) => (
              <li
                key={campo.id}
                className="flex items-center gap-1.5 rounded-sm border border-pauta bg-papel px-2 py-1 text-sm"
              >
                {campo.tipo === 'credencial' ? (
                  <>
                    <LockKeyhole aria-hidden className="size-3.5" />
                    {campo.nome}: {textoCredencial(campo)}
                  </>
                ) : (
                  <>
                    {campo.nome}
                    <span className="text-grafite">({NOMES_DOS_TIPOS[campo.tipo]})</span>
                  </>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-10 rounded-md border border-pauta bg-papel p-4 sm:p-6">
        <ConteudoProcedimento procedimento={procedimento} />
      </div>

      <HistoricoProcedimento procedimento={procedimento} />

      <DialogoEscolherDia
        isAberto={isAgendando}
        onMudarAberto={setIsAgendando}
        titulo="Agendar execução"
        descricao="Cria uma tarefa no dia escolhido. Ao executar por ela, a tarefa é concluída."
        dataInicial={hoje}
        hoje={hoje}
        onEscolher={(data) => void handleAgendar(data)}
      />

      <AlertDialog open={isConfirmandoExclusao} onOpenChange={setIsConfirmandoExclusao}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir “{procedimento.titulo}”?</AlertDialogTitle>
            <AlertDialogDescription>
              O procedimento, as versões anteriores e o histórico de execuções serão apagados de
              vez. Tarefas agendadas continuam no calendário, sem o vínculo.
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
