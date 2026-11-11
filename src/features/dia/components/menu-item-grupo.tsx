import { useRef, useState } from 'react'
import {
  Archive,
  Bell,
  CalendarArrowUp,
  CalendarDays,
  Clock,
  Flag,
  FolderOutput,
  ListPlus,
  MoreHorizontal,
  Pencil,
  Play,
  Square,
  Trash2,
  X,
} from 'lucide-react'
import { cn } from 'cn'
import { DialogoEscolherDia } from '@/components/dialogo-escolher-dia'
import { ItensDeNotaDoMenu } from '@/components/notas/itens-de-nota-do-menu'
import { RodapeTempoDoMenu } from '@/components/rodape-tempo-do-menu'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { DataLocal, GroupItem } from '@/db/types'
import { contarNotasQueFicamAvulsas } from '@/db/repositories/note-repository'
import { useAndamento } from '@/hooks/use-andamento'
import { useMoverTarefas } from '@/hooks/use-mover-tarefas'
import { useHorario } from '@/hooks/use-horario'
import { useLembretesDe } from '@/hooks/contexto-lembretes'
import { usePrioridade } from '@/hooks/use-prioridade'
import { podeMarcarAndamento } from '@/domain/andamento'
import { avisoNotasAvulsas, vinculoDoItem } from '@/lib/notas'
import { useAcoesGrupo } from '@/features/dia/hooks/use-acoes-grupo'

interface MenuItemGrupoProps {
  item: GroupItem
  /** Dia do card em que o item está. */
  data: DataLocal
  hoje: DataLocal
  onRenomear: () => void
  /** Abre as subetapas do item com a linha nova focada (ausente = o menu não oferece). */
  onAdicionarSubetapa?: () => void
  /** Abre o popover do horário na linha (ausente = o menu não oferece). */
  onDefinirHorario?: () => void
  /** Abre o popup de avisos na linha (ausente = o menu não oferece). */
  onNotificar?: () => void
  /** Botão ⋯ menor, para a Semana (linhas mais baixas). */
  isCompacto?: boolean
}

/**
 * Ações do item: adiar e mover copiam o item para o card da série no outro dia (aqui ele fica
 * como transferido); tirar do grupo o torna tarefa solta.
 */
export function MenuItemGrupo({
  item,
  data,
  hoje,
  onRenomear,
  onAdicionarSubetapa,
  onDefinirHorario,
  onNotificar,
  isCompacto = false,
}: MenuItemGrupoProps) {
  const totalAvisos = useLembretesDe(item.id).length
  const { tirarDoGrupo, arquivarItem, excluirItem } = useAcoesGrupo()
  const { mover, adiar } = useMoverTarefas()
  const { marcarEmAndamento, pararAndamento } = useAndamento()
  const { marcarPrioridade, tirarPrioridade } = usePrioridade()
  const { removerHorario } = useHorario()
  const [isEscolhendoDia, setIsEscolhendoDia] = useState(false)
  /** Notas que ficariam avulsas: só com elas o excluir pede confirmação. */
  const [notasAoExcluir, setNotasAoExcluir] = useState(0)
  const isAbrindoCampoRef = useRef(false)
  const isPendente = item.status === 'pendente'
  const isTransferido = item.status === 'transferido'

  async function handleExcluir() {
    const quantas = await contarNotasQueFicamAvulsas({ tipo: 'item', id: item.id })
    if (quantas > 0) setNotasAoExcluir(quantas)
    else await excluirItem(item.id)
  }

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Mais ações para ${item.titulo}`}
            className={cn(
              'text-grafite opacity-0 group-hover/linha:opacity-100 focus-visible:opacity-100 aria-expanded:opacity-100',
              isCompacto && 'size-5',
            )}
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          collisionPadding={8}
          // Botão pequeno: o menu tem largura própria, não a do botão.
          className="w-auto min-w-52"
          onCloseAutoFocus={(evento) => {
            if (!isAbrindoCampoRef.current) return
            evento.preventDefault()
            isAbrindoCampoRef.current = false
          }}
        >
          {isPendente && (
            <>
              {item.emAndamento ? (
                <DropdownMenuItem onSelect={() => void pararAndamento({ itens: [item.id] })}>
                  <Square /> Parar andamento
                </DropdownMenuItem>
              ) : (
                podeMarcarAndamento(item, data, hoje) && (
                  <DropdownMenuItem onSelect={() => void marcarEmAndamento({ itens: [item.id] })}>
                    <Play /> Marcar como em andamento
                  </DropdownMenuItem>
                )
              )}
              {item.prioridade ? (
                <DropdownMenuItem onSelect={() => void tirarPrioridade({ itens: [item.id] })}>
                  <Flag /> Tirar prioridade
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onSelect={() => void marcarPrioridade({ itens: [item.id] })}>
                  <Flag /> Marcar como prioridade
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => void adiar([], { itens: [item.id] })}>
                <CalendarArrowUp /> {data > hoje ? 'Adiar um dia' : 'Adiar para amanhã'}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setIsEscolhendoDia(true)}>
                <CalendarDays /> Mover para outro dia…
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          {!isTransferido && (
            <>
              {onDefinirHorario && (
                <DropdownMenuItem
                  onSelect={() => {
                    isAbrindoCampoRef.current = true
                    onDefinirHorario()
                  }}
                >
                  <Clock /> {item.horario ? 'Alterar horário…' : 'Definir horário…'}
                </DropdownMenuItem>
              )}
              {onNotificar && (
                <DropdownMenuItem
                  onSelect={() => {
                    isAbrindoCampoRef.current = true
                    onNotificar()
                  }}
                >
                  <Bell /> {totalAvisos > 0 ? `Notificar · ${totalAvisos}` : 'Notificar'}
                </DropdownMenuItem>
              )}
              {item.horario && (
                <DropdownMenuItem
                  onSelect={() => void removerHorario({ tipo: 'item', id: item.id })}
                >
                  <X /> Remover horário
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onSelect={() => {
                  isAbrindoCampoRef.current = true
                  onRenomear()
                }}
              >
                <Pencil /> Renomear
              </DropdownMenuItem>
              {onAdicionarSubetapa && (
                <DropdownMenuItem
                  onSelect={() => {
                    isAbrindoCampoRef.current = true
                    onAdicionarSubetapa()
                  }}
                >
                  <ListPlus /> Adicionar subetapa
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onSelect={() => void tirarDoGrupo(item.id)}>
                <FolderOutput /> Tirar do grupo
              </DropdownMenuItem>
            </>
          )}
          <ItensDeNotaDoMenu vinculo={vinculoDoItem(item)} />
          {isPendente && (
            <DropdownMenuItem onSelect={() => void arquivarItem(item.id)}>
              <Archive /> Arquivar
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => void handleExcluir()}>
            <Trash2 /> Excluir
          </DropdownMenuItem>
          <RodapeTempoDoMenu alvo={{ tipo: 'item', id: item.id, cadeiaId: item.cadeiaId }} />
        </DropdownMenuContent>
      </DropdownMenu>

      <DialogoEscolherDia
        isAberto={isEscolhendoDia}
        onMudarAberto={setIsEscolhendoDia}
        titulo="Mover item para outro dia"
        descricao={`“${item.titulo}” vai para o card deste grupo no dia escolhido e fica aqui como transferido.`}
        dataInicial={data}
        hoje={hoje}
        onEscolher={(destino) => void mover([], destino, { itens: [item.id] })}
      />

      <AlertDialog
        open={notasAoExcluir > 0}
        onOpenChange={(aberto) => !aberto && setNotasAoExcluir(0)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir “{item.titulo}”?</AlertDialogTitle>
            <AlertDialogDescription>
              O item será apagado de vez.{' '}
              <span className="mt-2 block font-medium text-tinta">
                {avisoNotasAvulsas(notasAoExcluir, 'item')}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => void excluirItem(item.id)}>
              Excluir item
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
