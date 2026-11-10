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

interface ConfirmarExclusaoProps {
  titulo: string
  /** O que acontece com os itens que usam a categoria. */
  descricao: string
  rotuloAcao: string
  isAberto: boolean
  /** Ação que não apaga nada (ex.: mover de tipo): botão na cor principal. */
  isNeutra?: boolean
  onMudarAberto: (isAberto: boolean) => void
  onConfirmar: () => void
}

/**
 * Confirma a exclusão (ou a troca de tipo) de categoria dizendo o que acontece
 * com os itens.
 */
export function ConfirmarExclusao({
  titulo,
  descricao,
  rotuloAcao,
  isAberto,
  isNeutra,
  onMudarAberto,
  onConfirmar,
}: ConfirmarExclusaoProps) {
  return (
    <AlertDialog open={isAberto} onOpenChange={onMudarAberto}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{titulo}</AlertDialogTitle>
          <AlertDialogDescription>{descricao}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction variant={isNeutra ? 'default' : 'destructive'} onClick={onConfirmar}>
            {rotuloAcao}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
