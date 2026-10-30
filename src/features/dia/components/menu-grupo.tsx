import { useRef, useState } from 'react'
import {
  Archive,
  CalendarArrowUp,
  CalendarDays,
  MoreHorizontal,
  Pencil,
  Trash2,
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { DataLocal } from '@/db/types'
import { useMoverTarefas } from '@/hooks/use-mover-tarefas'
import { pendentesDo, type GrupoDoDia } from '@/lib/grupos'
import { useAcoesGrupo } from '@/features/dia/hooks/use-acoes-grupo'
import { SubmenuCategoria } from '@/features/dia/components/submenu-categoria'

interface MenuGrupoProps {
  grupo: GrupoDoDia
  hoje: DataLocal
  onRenomear: () => void
}

/**
 * Ações do card. Adiar e mover COPIAM: o card fica aqui e os itens pendentes vão para o card
 * da mesma série no outro dia. Sem pendentes, não há o que copiar.
 */
export function MenuGrupo({ grupo, hoje, onRenomear }: MenuGrupoProps) {
  const { card, serie } = grupo
  const { arquivarGrupo, excluirGrupo, definirCategoriaDoGrupo } = useAcoesGrupo()
  const { mover, adiar } = useMoverTarefas()
  const [isConfirmandoExclusao, setIsConfirmandoExclusao] = useState(false)
  const [isEscolhendoDia, setIsEscolhendoDia] = useState(false)
  const quantidadePendentes = pendentesDo(grupo).length
  const isCopiavel = quantidadePendentes > 0
  const isAbrindoCampoRef = useRef(false)
  const quantidadeItens = grupo.itens.length

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Mais ações para o grupo ${serie.titulo}`}
            className="text-grafite opacity-0 group-hover/cabecalho:opacity-100 focus-visible:opacity-100 aria-expanded:opacity-100"
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
          <DropdownMenuItem
            disabled={!isCopiavel}
            onSelect={() => void adiar([], { grupos: [card.id] })}
          >
            <CalendarArrowUp /> {card.data > hoje ? 'Adiar um dia' : 'Adiar para amanhã'}
          </DropdownMenuItem>
          <DropdownMenuItem disabled={!isCopiavel} onSelect={() => setIsEscolhendoDia(true)}>
            <CalendarDays /> Mover para outro dia…
          </DropdownMenuItem>
          {!isCopiavel && (
            <p className="px-2 py-1 text-xs text-grafite">Nenhum item pendente para levar.</p>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => {
              isAbrindoCampoRef.current = true
              onRenomear()
            }}
          >
            <Pencil /> Renomear
          </DropdownMenuItem>
          <SubmenuCategoria
            atual={serie}
            onEscolher={(categoria) => void definirCategoriaDoGrupo(serie.id, categoria)}
          />
          <DropdownMenuItem onSelect={() => void arquivarGrupo(card.id)}>
            <Archive /> Arquivar
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setIsConfirmandoExclusao(true)}>
            <Trash2 /> Excluir…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DialogoEscolherDia
        isAberto={isEscolhendoDia}
        onMudarAberto={setIsEscolhendoDia}
        titulo={`Mover “${serie.titulo}” para outro dia`}
        descricao={`${quantidadePendentes === 1 ? 'O item pendente vai' : `Os ${quantidadePendentes} itens pendentes vão`} para o card “${serie.titulo}” do dia escolhido. Este card fica aqui como registro.`}
        dataInicial={card.data}
        hoje={hoje}
        onEscolher={(destino) => void mover([], destino, { grupos: [card.id] })}
      />

      <AlertDialog open={isConfirmandoExclusao} onOpenChange={setIsConfirmandoExclusao}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir o grupo “{serie.titulo}” deste dia?</AlertDialogTitle>
            <AlertDialogDescription>
              {quantidadeItens === 0
                ? 'O card vazio será apagado.'
                : `O card e ${quantidadeItens === 1 ? 'o item' : `os ${quantidadeItens} itens`} dele serão apagados de vez. Os cards de outros dias continuam. Para só tirar do calendário, use Arquivar.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => void excluirGrupo(card.id)}>
              Excluir grupo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
