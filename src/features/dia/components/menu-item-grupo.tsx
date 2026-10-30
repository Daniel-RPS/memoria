import { useRef, useState } from 'react'
import {
  Archive,
  CalendarArrowUp,
  CalendarDays,
  FolderOutput,
  MoreHorizontal,
  Pencil,
  Trash2,
} from 'lucide-react'
import { DialogoEscolherDia } from '@/components/dialogo-escolher-dia'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { DataLocal, GroupItem } from '@/db/types'
import { useMoverTarefas } from '@/hooks/use-mover-tarefas'
import { useAcoesGrupo } from '@/features/dia/hooks/use-acoes-grupo'

interface MenuItemGrupoProps {
  item: GroupItem
  /** Dia do card em que o item está. */
  data: DataLocal
  hoje: DataLocal
  onRenomear: () => void
}

/**
 * Ações do item: adiar e mover copiam o item para o card da série no outro dia (aqui ele fica
 * como transferido); tirar do grupo o torna tarefa solta.
 */
export function MenuItemGrupo({ item, data, hoje, onRenomear }: MenuItemGrupoProps) {
  const { tirarDoGrupo, arquivarItem, excluirItem } = useAcoesGrupo()
  const { mover, adiar } = useMoverTarefas()
  const [isEscolhendoDia, setIsEscolhendoDia] = useState(false)
  const isAbrindoCampoRef = useRef(false)
  const isPendente = item.status === 'pendente'
  const isTransferido = item.status === 'transferido'

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Mais ações para ${item.titulo}`}
            className="text-grafite opacity-0 group-hover/linha:opacity-100 focus-visible:opacity-100 aria-expanded:opacity-100"
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          onCloseAutoFocus={(evento) => {
            if (!isAbrindoCampoRef.current) return
            evento.preventDefault()
            isAbrindoCampoRef.current = false
          }}
        >
          {isPendente && (
            <>
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
              <DropdownMenuItem
                onSelect={() => {
                  isAbrindoCampoRef.current = true
                  onRenomear()
                }}
              >
                <Pencil /> Renomear
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void tirarDoGrupo(item.id)}>
                <FolderOutput /> Tirar do grupo
              </DropdownMenuItem>
            </>
          )}
          {isPendente && (
            <DropdownMenuItem onSelect={() => void arquivarItem(item.id)}>
              <Archive /> Arquivar
            </DropdownMenuItem>
          )}
          {!isTransferido && <DropdownMenuSeparator />}
          <DropdownMenuItem variant="destructive" onSelect={() => void excluirItem(item.id)}>
            <Trash2 /> Excluir
          </DropdownMenuItem>
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
    </>
  )
}
