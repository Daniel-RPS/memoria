import { useState } from 'react'
import { ArrowRight, CalendarArrowUp, CalendarDays } from 'lucide-react'
import { DialogoLevarPendentes } from '@/components/dialogo-levar-pendentes'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { DataLocal } from '@/db/types'
import { useMoverTarefas } from '@/hooks/use-mover-tarefas'
import { rotuloLevarAdiante, type GrupoDoDia } from '@/lib/grupos'

interface MenuLevarGrupoProps {
  grupo: GrupoDoDia
  hoje: DataLocal
}

/** Botão → do card da semana: levar os pendentes sem arrastar. */
export function MenuLevarGrupo({ grupo, hoje }: MenuLevarGrupoProps) {
  const { adiar } = useMoverTarefas()
  const [isEscolhendoDia, setIsEscolhendoDia] = useState(false)
  const { card, serie } = grupo

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={`Levar pendentes de ${serie.titulo}`}
            data-sem-arrasto=""
            className="-my-1 shrink-0 cursor-pointer text-grafite hover:text-tinta"
          >
            <ArrowRight />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => void adiar([], { grupos: [card.id] })}>
            <CalendarArrowUp /> {rotuloLevarAdiante(card.data, hoje)}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setIsEscolhendoDia(true)}>
            <CalendarDays /> Levar pendentes para…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <DialogoLevarPendentes
        grupo={grupo}
        hoje={hoje}
        isAberto={isEscolhendoDia}
        onMudarAberto={setIsEscolhendoDia}
      />
    </>
  )
}
