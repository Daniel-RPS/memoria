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
import type { CategoriaComSubcategorias } from '@/lib/categorias'
import { useAcoesCategoria } from '@/features/categorias/hooks/use-acoes-categoria'
import { useContagemTarefas } from '@/features/categorias/hooks/use-contagem-tarefas'

interface ConfirmarExclusaoCategoriaProps {
  categoria: CategoriaComSubcategorias
  isAberto: boolean
  onMudarAberto: (isAberto: boolean) => void
}

function descreverTarefas(quantidade: number) {
  if (quantidade === 0) return 'Nenhuma tarefa usa esta categoria.'
  const tarefas = quantidade === 1 ? '1 tarefa continua' : `${quantidade} tarefas continuam`
  return `${tarefas} no calendário, só que sem categoria.`
}

function descreverSubcategorias(quantidade: number) {
  if (quantidade === 0) return ''
  if (quantidade === 1) return ' A subcategoria também será excluída.'
  return ` As ${quantidade} subcategorias também serão excluídas.`
}

/** Confirma a exclusão dizendo o que acontece com as tarefas e subcategorias. */
export function ConfirmarExclusaoCategoria({
  categoria,
  isAberto,
  onMudarAberto,
}: ConfirmarExclusaoCategoriaProps) {
  const { excluirCategoria } = useAcoesCategoria()
  const quantidade = useContagemTarefas(categoria.id, isAberto)

  return (
    <AlertDialog open={isAberto} onOpenChange={onMudarAberto}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir “{categoria.nome}”?</AlertDialogTitle>
          <AlertDialogDescription>
            {quantidade === undefined ? 'Contando tarefas…' : descreverTarefas(quantidade)}
            {descreverSubcategorias(categoria.subcategorias.length)}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => void excluirCategoria(categoria.id)}
          >
            Excluir categoria
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
