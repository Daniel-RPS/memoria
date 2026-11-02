import { NotebookText, StickyNote } from 'lucide-react'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import type { Vinculo } from '@/db/types'
import { usePainelDeNotas, useQuantasNotas } from '@/hooks/contexto-painel-notas'

/** "Adicionar nota" e, quando já há, "Ver notas (N)" no menu ⋯ de tarefa, grupo e item. */
export function ItensDeNotaDoMenu({ vinculo }: { vinculo: Vinculo }) {
  const { abrir } = usePainelDeNotas()
  const quantas = useQuantasNotas(vinculo)
  return (
    <>
      <DropdownMenuItem onSelect={() => abrir(vinculo, { criar: true })}>
        <StickyNote /> Adicionar nota
      </DropdownMenuItem>
      {quantas > 0 && (
        <DropdownMenuItem onSelect={() => abrir(vinculo)}>
          <NotebookText /> Ver notas ({quantas})
        </DropdownMenuItem>
      )}
    </>
  )
}
