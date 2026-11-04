import { useState, type FormEvent } from 'react'
import { format } from 'date-fns'
import { ChevronRight, Pencil, Trash2 } from 'lucide-react'
import { cn } from 'cn'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import type { DataLocal } from '@/db/types'
import {
  editarSessao,
  excluirSessao,
  formatarDuracao,
  type ResumoTarefaNoTempo,
  type SessaoNoPeriodo,
} from '@/domain/tempo'
import { useCorNaTela } from '@/hooks/use-cor-na-tela'
import { deDataLocal } from '@/lib/datas'
import { ErroDeValidacao } from '@/lib/erros'

interface ListaTarefasTempoProps {
  tarefas: ResumoTarefaNoTempo[]
}

function formatarDiasTrabalhados(dias: DataLocal[]): string {
  if (dias.length === 0) return ''
  if (dias.length <= 3) {
    return dias.map((d) => format(deDataLocal(d), 'dd/MM')).join(', ')
  }
  return `${dias.length} dias (${format(deDataLocal(dias[0]), 'dd/MM')}–${format(deDataLocal(dias[dias.length - 1]), 'dd/MM')})`
}

function combinarDiaEHorario(baseIso: string, horarioHHmm: string): Date {
  const match = /^(\d{1,2}):(\d{2})$/.exec(horarioHHmm.trim())
  if (!match) throw new ErroDeValidacao('Informe o horário no formato HH:mm.')
  const horas = Number(match[1])
  const minutos = Number(match[2])
  const data = new Date(baseIso)
  data.setHours(horas, minutos, 0, 0)
  return data
}

/**
 * Lista de tarefas medidas no período, ordenadas por tempo (maior primeiro).
 * Clicar na linha expande as sessões individuais com edição de horário e exclusão.
 */
export function ListaTarefasTempo({ tarefas }: ListaTarefasTempoProps) {
  const corNaTela = useCorNaTela()
  const [abertas, setAbertas] = useState<Set<string>>(() => new Set())
  const [sessaoEditando, setSessaoEditando] = useState<{
    sessao: SessaoNoPeriodo
    tituloTarefa: string
  } | null>(null)
  const [horaInicio, setHoraInicio] = useState('')
  const [horaFim, setHoraFim] = useState('')
  const [erroEdicao, setErroEdicao] = useState<string | null>(null)
  const [sessaoExcluindo, setSessaoExcluindo] = useState<{
    sessao: SessaoNoPeriodo
    tituloTarefa: string
  } | null>(null)

  function alternarAberta(chave: string) {
    setAbertas((atual) => {
      const proximo = new Set(atual)
      if (proximo.has(chave)) proximo.delete(chave)
      else proximo.add(chave)
      return proximo
    })
  }

  function handleAbrirEdicao(sessao: SessaoNoPeriodo, tituloTarefa: string) {
    const fimRef = sessao.fim ?? sessao.inicio
    setHoraInicio(format(new Date(sessao.inicio), 'HH:mm'))
    setHoraFim(format(new Date(fimRef), 'HH:mm'))
    setErroEdicao(null)
    setSessaoEditando({ sessao, tituloTarefa })
  }

  async function handleSalvarEdicao(evento: FormEvent) {
    evento.preventDefault()
    if (!sessaoEditando) return
    try {
      const { sessao } = sessaoEditando
      const novoInicio = combinarDiaEHorario(sessao.inicio, horaInicio)
      let novoFim: Date | undefined
      if (horaFim.trim() !== '') {
        novoFim = combinarDiaEHorario(sessao.fim ?? sessao.inicio, horaFim)
        if (novoFim.getTime() <= novoInicio.getTime()) {
          throw new ErroDeValidacao('O horário de fim deve ser depois do início.')
        }
      }
      await editarSessao(sessao.id, {
        inicio: novoInicio.toISOString(),
        ...(novoFim ? { fim: novoFim.toISOString() } : {}),
      })
      setSessaoEditando(null)
    } catch (err) {
      setErroEdicao(err instanceof ErroDeValidacao ? err.message : 'Horário inválido.')
    }
  }

  async function handleConfirmarExclusao() {
    if (!sessaoExcluindo) return
    await excluirSessao(sessaoExcluindo.sessao.id)
    setSessaoExcluindo(null)
  }

  return (
    <>
      <ul
        aria-label="Tarefas medidas"
        className="divide-y divide-pauta border-t border-b border-pauta"
      >
        {tarefas.map((tarefa) => {
          const isAberta = abertas.has(tarefa.chave)
          const cor = tarefa.categoria ? corNaTela(tarefa.categoria.cor) : 'var(--grafite)'
          const idSessoes = `sessoes-${tarefa.chave.replace(/[^a-zA-Z0-9_-]/g, '-')}`

          return (
            <li key={tarefa.chave} data-linha-tempo={tarefa.titulo} className="bg-papel">
              <button
                type="button"
                aria-expanded={isAberta}
                aria-controls={idSessoes}
                onClick={() => alternarAberta(tarefa.chave)}
                className="flex min-h-11 w-full items-center gap-2.5 px-2 py-2 text-left transition-colors hover:bg-accent/50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-caneta"
              >
                <ChevronRight
                  aria-hidden
                  className={cn(
                    'size-4 shrink-0 text-grafite transition-transform motion-reduce:transition-none',
                    isAberta && 'rotate-90',
                  )}
                />
                <span
                  aria-hidden
                  title={tarefa.categoria?.nome ?? 'Sem categoria'}
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: cor }}
                />
                <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                  <span className="font-medium break-words text-tinta">{tarefa.titulo}</span>
                  {tarefa.nomeGrupo && (
                    <span className="text-xs text-grafite">{tarefa.nomeGrupo}</span>
                  )}
                  {tarefa.isArquivada && (
                    <span className="rounded-sm bg-accent px-1.5 py-0.5 text-xs text-grafite italic">
                      arquivada
                    </span>
                  )}
                  <span className="text-xs text-grafite tabular-nums">
                    {formatarDiasTrabalhados(tarefa.diasTrabalhados)}
                  </span>
                </div>
                <span className="shrink-0 text-sm font-semibold whitespace-nowrap text-tinta tabular-nums">
                  {formatarDuracao(tarefa.tempoTotalMs)}
                </span>
              </button>

              {isAberta && (
                <ul
                  id={idSessoes}
                  aria-label={`Sessões de ${tarefa.titulo}`}
                  className="divide-y divide-pauta/60 border-t border-pauta/60 bg-background/40 py-1 pr-2 pl-9"
                >
                  {tarefa.sessoes.map((sessao) => {
                    const dataTexto = format(deDataLocal(sessao.dataLocal), 'dd/MM/yyyy')
                    const inicioTexto = format(new Date(sessao.inicio), 'HH:mm')
                    const fimTexto = sessao.fim ? format(new Date(sessao.fim), 'HH:mm') : 'agora'
                    return (
                      <li
                        key={sessao.id}
                        data-sessao-id={sessao.id}
                        className="flex flex-wrap items-center justify-between gap-2 py-1.5 text-xs"
                      >
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 tabular-nums">
                          <span className="text-grafite">{dataTexto}</span>
                          <span className="font-medium text-tinta">
                            {inicioTexto}–{fimTexto}
                          </span>
                          <span className="text-violeta-profundo">
                            {formatarDuracao(sessao.duracaoNoPeriodoMs)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Editar sessão de ${tarefa.titulo} (${inicioTexto}–${fimTexto})`}
                            onClick={() => handleAbrirEdicao(sessao, tarefa.titulo)}
                            className="size-6 text-grafite hover:text-tinta"
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Excluir sessão de ${tarefa.titulo} (${inicioTexto}–${fimTexto})`}
                            onClick={() =>
                              setSessaoExcluindo({ sessao, tituloTarefa: tarefa.titulo })
                            }
                            className="size-6 text-grafite hover:text-destructive"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </li>
          )
        })}
      </ul>

      <Dialog
        open={sessaoEditando !== null}
        onOpenChange={(aberto) => !aberto && setSessaoEditando(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar sessão</DialogTitle>
            <DialogDescription>
              {sessaoEditando && (
                <>
                  Ajuste o horário da sessão de “{sessaoEditando.tituloTarefa}” em{' '}
                  {format(deDataLocal(sessaoEditando.sessao.dataLocal), 'dd/MM/yyyy')}.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(evento) => void handleSalvarEdicao(evento)} className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-1.5 text-sm font-medium text-tinta">
                <span>Horário de início</span>
                <Input
                  type="time"
                  aria-label="Horário de início"
                  value={horaInicio}
                  onChange={(evento) => {
                    setHoraInicio(evento.target.value)
                    setErroEdicao(null)
                  }}
                  required
                />
              </label>
              <label className="grid gap-1.5 text-sm font-medium text-tinta">
                <span>Horário de fim</span>
                <Input
                  type="time"
                  aria-label="Horário de fim"
                  value={horaFim}
                  onChange={(evento) => {
                    setHoraFim(evento.target.value)
                    setErroEdicao(null)
                  }}
                  required
                />
              </label>
            </div>
            {erroEdicao && <p className="text-xs text-destructive">{erroEdicao}</p>}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setSessaoEditando(null)}>
                Cancelar
              </Button>
              <Button type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={sessaoExcluindo !== null}
        onOpenChange={(aberto) => !aberto && setSessaoExcluindo(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir sessão?</AlertDialogTitle>
            <AlertDialogDescription>
              {sessaoExcluindo && (
                <>
                  Esta sessão de “{sessaoExcluindo.tituloTarefa}” será removida do histórico de
                  tempo.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => void handleConfirmarExclusao()}>
              Excluir sessão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
