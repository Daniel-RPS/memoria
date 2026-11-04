import { useState, type FormEvent } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
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
import {
  editarSessao,
  excluirSessao,
  formatarDuracao,
  type CategoriaComTarefas,
  type SessaoNoPeriodo,
} from '@/domain/tempo'
import { useCorNaTela } from '@/hooks/use-cor-na-tela'
import { deDataLocal } from '@/lib/datas'
import { ErroDeValidacao } from '@/lib/erros'

const CHAVE_CATEGORIAS_ABERTAS = 'memoria:dados-categorias-abertas'

function lerCategoriasAbertas(): Set<string> {
  try {
    const salvo = localStorage.getItem(CHAVE_CATEGORIAS_ABERTAS)
    if (!salvo) return new Set()
    const parsed = JSON.parse(salvo)
    return Array.isArray(parsed) ? new Set(parsed) : new Set()
  } catch {
    return new Set()
  }
}

function salvarCategoriasAbertas(ids: Set<string>) {
  try {
    localStorage.setItem(CHAVE_CATEGORIAS_ABERTAS, JSON.stringify([...ids]))
  } catch {
    // ignorar quota ou falha de storage
  }
}

interface ListaTarefasTempoProps {
  categorias: CategoriaComTarefas[]
  isFiltrando?: boolean
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
 * Lista de tarefas medidas agrupadas por categoria.
 * Cada linha é uma categoria expansível contendo as tarefas e as respectivas sessões.
 * Categorias abertas são lembradas no localStorage.
 */
export function ListaTarefasTempo({ categorias, isFiltrando = false }: ListaTarefasTempoProps) {
  const corNaTela = useCorNaTela()
  const [categoriasAbertas, setCategoriasAbertas] = useState<Set<string>>(lerCategoriasAbertas)
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

  function alternarCategoria(chave: string) {
    setCategoriasAbertas((atual) => {
      const proximo = new Set(atual)
      if (proximo.has(chave)) proximo.delete(chave)
      else proximo.add(chave)
      salvarCategoriasAbertas(proximo)
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
        aria-label="Tarefas medidas por categoria"
        className="divide-y divide-pauta border-t border-b border-pauta"
      >
        {categorias.map((cat) => {
          const chaveCat = cat.id ?? '__sem_categoria__'
          const isAberta = isFiltrando || categoriasAbertas.has(chaveCat)
          const cor = cat.cor ? corNaTela(cat.cor) : 'var(--grafite)'
          const idListaTarefas = `tarefas-cat-${chaveCat.replace(/[^a-zA-Z0-9_-]/g, '-')}`

          return (
            <li key={chaveCat} data-categoria-tempo={cat.nome} className="bg-papel">
              <button
                type="button"
                aria-expanded={isAberta}
                aria-controls={idListaTarefas}
                onClick={() => alternarCategoria(chaveCat)}
                className="flex min-h-11 w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-accent/50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-caneta"
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
                  title={cat.nome}
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: cor }}
                />
                <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                  <span className="font-semibold text-sm text-tinta">{cat.nome}</span>
                  <span className="text-xs text-grafite">
                    {cat.tarefas.length} {cat.tarefas.length === 1 ? 'tarefa' : 'tarefas'}
                  </span>
                </div>
                <span className="shrink-0 text-sm font-semibold whitespace-nowrap text-tinta tabular-nums">
                  {formatarDuracao(cat.tempoTotalMs)}
                </span>
              </button>

              {isAberta && (
                <ul
                  id={idListaTarefas}
                  aria-label={`Tarefas de ${cat.nome}`}
                  className="divide-y divide-pauta/40 border-t border-pauta/60 bg-background/30"
                >
                  {cat.tarefas.map((tarefa) => {
                    return (
                      <li
                        key={tarefa.chave}
                        data-linha-tempo={tarefa.titulo}
                        className="py-2.5 pr-3 pl-8"
                      >
                        {/* Linha da tarefa */}
                        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                          <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-0.5">
                            <span className="text-sm font-medium break-words text-tinta">
                              {tarefa.titulo}
                            </span>
                            {tarefa.nomeGrupo && (
                              <span className="text-xs text-grafite">{tarefa.nomeGrupo}</span>
                            )}
                            {tarefa.isArquivada && (
                              <span className="rounded-sm bg-accent px-1.5 py-0.5 text-xs text-grafite italic">
                                arquivada
                              </span>
                            )}
                          </div>
                          <span className="shrink-0 text-xs font-semibold whitespace-nowrap text-tinta tabular-nums">
                            {formatarDuracao(tarefa.tempoTotalMs)}
                          </span>
                        </div>

                        {/* Sessões da tarefa */}
                        <ul
                          aria-label={`Sessões de ${tarefa.titulo}`}
                          className="mt-1.5 grid gap-1 pl-2 border-l border-pauta/50"
                        >
                          {tarefa.sessoes.map((sessao) => {
                            const dataTexto = format(
                              deDataLocal(sessao.dataLocal),
                              'cccccc, dd/MM',
                              {
                                locale: ptBR,
                              },
                            )
                            const inicioTexto = format(new Date(sessao.inicio), 'HH:mm')
                            const fimTexto = sessao.fim
                              ? format(new Date(sessao.fim), 'HH:mm')
                              : 'agora'
                            const isCurta = sessao.duracaoNoPeriodoMs < 60_000

                            return (
                              <li
                                key={sessao.id}
                                data-sessao-id={sessao.id}
                                className={cn(
                                  'flex flex-wrap items-center justify-between gap-2 py-0.5 text-xs',
                                  isCurta ? 'opacity-60 text-grafite' : 'text-grafite',
                                )}
                              >
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 tabular-nums">
                                  <span>{dataTexto}</span>
                                  <span
                                    className={cn(
                                      'font-medium',
                                      isCurta ? 'text-grafite' : 'text-tinta',
                                    )}
                                  >
                                    {inicioTexto} – {fimTexto}
                                  </span>
                                  <span
                                    className={
                                      isCurta ? 'text-grafite' : 'text-violeta-profundo font-medium'
                                    }
                                  >
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
