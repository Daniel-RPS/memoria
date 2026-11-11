import { TextoComLinks } from '@/components/texto-com-links'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { NOMES_DOS_TIPOS, rotuloDoArquivamento, type ItemArquivado } from '@/lib/arquivados'

interface DialogoAbrirProps {
  item: ItemArquivado | null
  onFechar: () => void
}

/** Conteúdo do arquivado só para ler: nada se edita aqui (desarquivar primeiro). */
export function DialogoAbrir({ item, onFechar }: DialogoAbrirProps) {
  return (
    <Dialog open={item !== null} onOpenChange={(isAberto) => !isAberto && onFechar()}>
      <DialogContent className="max-w-lg">
        {item && (
          <>
            <DialogHeader>
              <DialogTitle className="break-words">
                <TextoComLinks texto={item.titulo} />
              </DialogTitle>
              <DialogDescription>
                {NOMES_DOS_TIPOS[item.tipo].singular} · {item.detalhe} ·{' '}
                {rotuloDoArquivamento(item.arquivadoEm)}
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-[50vh] overflow-y-auto text-sm leading-6 break-words whitespace-pre-wrap">
              {item.leitura.trim() ? (
                <TextoComLinks texto={item.leitura} />
              ) : (
                <span className="text-grafite">Sem conteúdo.</span>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

interface DialogoExcluirProps {
  itens: ItemArquivado[] | null
  onCancelar: () => void
  onConfirmar: (itens: ItemArquivado[]) => void
}

/** Confirmação da exclusão permanente (uma ou várias). */
export function DialogoExcluir({ itens, onCancelar, onConfirmar }: DialogoExcluirProps) {
  const quantidade = itens?.length ?? 0
  return (
    <AlertDialog open={itens !== null} onOpenChange={(isAberto) => !isAberto && onCancelar()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {quantidade === 1
              ? `Excluir permanentemente “${itens![0]!.titulo}”?`
              : `Excluir permanentemente ${quantidade} itens?`}
          </AlertDialogTitle>
          <AlertDialogDescription>
            Isso apaga de vez e não dá para desfazer. As notas ligadas a tarefas e grupos excluídos
            continuam, como notas avulsas.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={() => itens && onConfirmar(itens)}>
            Excluir permanentemente
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
