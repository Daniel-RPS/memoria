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
import { podeMoverGrupo, type GrupoDoDia } from '@/lib/grupos'
import { useAcoesGrupo } from '@/features/dia/hooks/use-acoes-grupo'
import { SubmenuCategoria } from '@/features/dia/components/submenu-categoria'

interface MenuGrupoProps {
  grupo: GrupoDoDia
  hoje: DataLocal
  onRenomear: () => void
}

/** Ações do card: adiar, mover (só os pendentes vão), renomear, categoria, arquivar, excluir. */
export function MenuGrupo({ grupo, hoje, onRenomear }: MenuGrupoProps) {
  const { instancia, serie } = grupo
  const { arquivarGrupo, excluirGrupo, definirCategoriaDoGrupo } = useAcoesGrupo()
  const { mover, adiar } = useMoverTarefas()
  const [isConfirmandoExclusao, setIsConfirmandoExclusao] = useState(false)
  const [isEscolhendoDia, setIsEscolhendoDia] = useState(false)
  const isMovivel = podeMoverGrupo(grupo)
  const isFutura = instancia.data > hoje
  const isAbrindoCampoRef = useRef(false)
  const quantidadeItens = grupo.pendentes.length + grupo.concluidas.length

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
          {isMovivel && (
            <>
              <DropdownMenuItem onSelect={() => void adiar([], [instancia.id])}>
                <CalendarArrowUp /> {isFutura ? 'Adiar um dia' : 'Adiar para amanhã'}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setIsEscolhendoDia(true)}>
                <CalendarDays /> Mover para outro dia…
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
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
          {isMovivel && (
            <DropdownMenuItem onSelect={() => void arquivarGrupo(instancia.id)}>
              <Archive /> Arquivar
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setIsConfirmandoExclusao(true)}>
            <Trash2 /> Excluir…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DialogoEscolherDia
        isAberto={isEscolhendoDia}
        onMudarAberto={setIsEscolhendoDia}
        titulo="Mover grupo para outro dia"
        descricao={
          grupo.concluidas.length > 0
            ? `Só os itens pendentes de “${serie.titulo}” vão; os concluídos ficam neste dia.`
            : serie.titulo
        }
        dataInicial={instancia.data}
        hoje={hoje}
        onEscolher={(destino) => void mover([], destino, [instancia.id])}
      />

      <AlertDialog open={isConfirmandoExclusao} onOpenChange={setIsConfirmandoExclusao}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir o grupo “{serie.titulo}” deste dia?</AlertDialogTitle>
            <AlertDialogDescription>
              {quantidadeItens === 0
                ? 'O card vazio será apagado.'
                : `O card e ${quantidadeItens === 1 ? 'o item' : `os ${quantidadeItens} itens`} dele serão apagados de vez, com anotações e anexos. Os cards de outros dias continuam. Para só tirar do calendário, use Arquivar.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => void excluirGrupo(instancia.id)}
            >
              Excluir grupo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
