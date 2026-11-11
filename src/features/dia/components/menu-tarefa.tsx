import { useRef, useState } from 'react'
import {
  Archive,
  Bell,
  CalendarArrowUp,
  CalendarDays,
  Clock,
  Flag,
  FolderInput,
  ListPlus,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Play,
  Square,
  Trash2,
  X,
} from 'lucide-react'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ItensDeNotaDoMenu } from '@/components/notas/itens-de-nota-do-menu'
import { RodapeTempoDoMenu } from '@/components/rodape-tempo-do-menu'
import { SubmenuCategoria } from '@/components/seletor-categoria/submenu-categoria'
import type { DataLocal, Task } from '@/db/types'
import { useAcoesDeArquivo } from '@/hooks/use-acoes-de-arquivo'
import { useAndamento } from '@/hooks/use-andamento'
import { useHorario } from '@/hooks/use-horario'
import { useLembretesDe } from '@/hooks/contexto-lembretes'
import { useAvisoNotasAvulsas } from '@/hooks/use-aviso-notas-avulsas'
import { useMoverTarefas } from '@/hooks/use-mover-tarefas'
import { usePrioridade } from '@/hooks/use-prioridade'
import { podeMarcarAndamento } from '@/domain/andamento'
import { useAcoesTarefa } from '@/features/dia/hooks/use-acoes-tarefa'
import { useGruposDoDia } from '@/features/dia/hooks/contexto-extras'

interface MenuTarefaProps {
  tarefa: Task
  hoje: DataLocal
  onRenomear: () => void
  onAdicionarSubtarefa: () => void
  onAbrirAnexos: () => void
  /** Abre o popover do horário na linha. */
  onDefinirHorario: () => void
  /** Abre o popup de avisos na linha. */
  onNotificar: () => void
}

/**
 * Ações secundárias da tarefa: adiar, mover, renomear, subetapa, categoria, grupo, arquivar e
 * excluir. Item de grupo usa a categoria do grupo e pode sair dele.
 */
export function MenuTarefa({
  tarefa,
  hoje,
  onRenomear,
  onAdicionarSubtarefa,
  onAbrirAnexos,
  onDefinirHorario,
  onNotificar,
}: MenuTarefaProps) {
  const totalAvisos = useLembretesDe(tarefa.id).length
  const { excluirTarefa, definirCategoria, colocarNoGrupo } = useAcoesTarefa()
  const { arquivarComAviso } = useAcoesDeArquivo()
  const gruposDoDia = useGruposDoDia()
  const { mover, adiar } = useMoverTarefas()
  const { marcarEmAndamento, pararAndamento } = useAndamento()
  const { marcarPrioridade, tirarPrioridade } = usePrioridade()
  const { removerHorario } = useHorario()
  const [isMenuAberto, setIsMenuAberto] = useState(false)
  const [isConfirmandoExclusao, setIsConfirmandoExclusao] = useState(false)
  const [isEscolhendoDia, setIsEscolhendoDia] = useState(false)
  const isPendente = tarefa.status === 'pendente'
  const isFutura = tarefa.data > hoje
  const avisoNotas = useAvisoNotasAvulsas({ tipo: 'tarefa', id: tarefa.id }, isConfirmandoExclusao)
  // Ações que abrem um campo: o foco deve ficar nele, não voltar para o botão do menu.
  const isAbrindoCampoRef = useRef(false)

  function abrirCampo(acao: () => void) {
    isAbrindoCampoRef.current = true
    acao()
  }

  return (
    <>
      {/* modal={false}: evita o body travado ao abrir o diálogo de exclusão a partir do menu. */}
      <DropdownMenu open={isMenuAberto} onOpenChange={setIsMenuAberto} modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Mais ações para ${tarefa.titulo}`}
            className="text-grafite opacity-0 group-hover/linha:opacity-100 focus-visible:opacity-100 aria-expanded:opacity-100"
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
              {tarefa.emAndamento ? (
                <DropdownMenuItem onSelect={() => void pararAndamento({ tarefas: [tarefa.id] })}>
                  <Square /> Parar andamento
                </DropdownMenuItem>
              ) : (
                podeMarcarAndamento(tarefa, tarefa.data, hoje) && (
                  <DropdownMenuItem
                    onSelect={() => void marcarEmAndamento({ tarefas: [tarefa.id] })}
                  >
                    <Play /> Marcar como em andamento
                  </DropdownMenuItem>
                )
              )}
              {tarefa.prioridade ? (
                <DropdownMenuItem onSelect={() => void tirarPrioridade({ tarefas: [tarefa.id] })}>
                  <Flag /> Tirar prioridade
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onSelect={() => void marcarPrioridade({ tarefas: [tarefa.id] })}>
                  <Flag /> Marcar como prioridade
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => void adiar([tarefa.id])}>
                <CalendarArrowUp /> {isFutura ? 'Adiar um dia' : 'Adiar para amanhã'}
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuItem onSelect={() => abrirCampo(onDefinirHorario)}>
            <Clock /> {tarefa.horario ? 'Alterar horário…' : 'Definir horário…'}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => abrirCampo(onNotificar)}>
            <Bell /> {totalAvisos > 0 ? `Notificar · ${totalAvisos}` : 'Notificar'}
          </DropdownMenuItem>
          {tarefa.horario && (
            <DropdownMenuItem
              onSelect={() => void removerHorario({ tipo: 'tarefa', id: tarefa.id })}
            >
              <X /> Remover horário
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={() => setIsEscolhendoDia(true)}>
            <CalendarDays /> Mover para outro dia…
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => abrirCampo(onRenomear)}>
            <Pencil /> Renomear
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => abrirCampo(onAdicionarSubtarefa)}>
            <ListPlus /> Adicionar subetapa
          </DropdownMenuItem>
          <ItensDeNotaDoMenu vinculo={{ tipo: 'tarefa', id: tarefa.id }} />
          <DropdownMenuItem onSelect={() => abrirCampo(onAbrirAnexos)}>
            <Paperclip /> Anexos
          </DropdownMenuItem>
          <SubmenuCategoria
            tipo="grupo"
            atual={tarefa}
            onEscolher={(categoria) => void definirCategoria(tarefa.id, categoria)}
            onFechar={() => setIsMenuAberto(false)}
          />
          {isPendente && gruposDoDia.length > 0 && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <FolderInput /> Colocar no grupo
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="max-h-80 overflow-y-auto">
                {gruposDoDia.map((grupo) => (
                  <DropdownMenuItem
                    key={grupo.id}
                    onSelect={() => void colocarNoGrupo(tarefa.id, grupo.id)}
                  >
                    {grupo.titulo}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          )}
          <DropdownMenuItem
            onSelect={() => void arquivarComAviso({ tarefas: [tarefa.id] }, ['tarefa'])}
          >
            <Archive /> Arquivar
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setIsConfirmandoExclusao(true)}>
            <Trash2 /> Excluir…
          </DropdownMenuItem>
          <RodapeTempoDoMenu alvo={{ tipo: 'tarefa', id: tarefa.id }} />
        </DropdownMenuContent>
      </DropdownMenu>

      <DialogoEscolherDia
        isAberto={isEscolhendoDia}
        onMudarAberto={setIsEscolhendoDia}
        titulo="Mover para outro dia"
        descricao={tarefa.titulo}
        dataInicial={tarefa.data}
        hoje={hoje}
        onEscolher={(destino) => void mover([tarefa.id], destino)}
      />

      <AlertDialog open={isConfirmandoExclusao} onOpenChange={setIsConfirmandoExclusao}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir “{tarefa.titulo}”?</AlertDialogTitle>
            <AlertDialogDescription>
              A tarefa e as subetapas dela serão apagadas de vez. Para só tirar do calendário, use
              Arquivar.
              {avisoNotas && (
                <span className="mt-2 block font-medium text-tinta">{avisoNotas}</span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => void excluirTarefa(tarefa.id)}>
              Excluir tarefa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
