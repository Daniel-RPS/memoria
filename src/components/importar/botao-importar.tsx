import { useState } from 'react'
import { FileInput } from 'lucide-react'
import { DialogoImportar, type DialogoImportarProps } from '@/components/importar/dialogo-importar'
import { Button } from '@/components/ui/button'

type BotaoImportarProps = Pick<DialogoImportarProps, 'origemInicial' | 'conteudoInicial'> & {
  variant?: 'outline' | 'ghost'
}

/** "Importar" que abre o diálogo de importação (Backup, Procedimentos e Notas). */
export function BotaoImportar({ variant = 'outline', ...props }: BotaoImportarProps) {
  const [isAberto, setIsAberto] = useState(false)
  return (
    <>
      <Button variant={variant} onClick={() => setIsAberto(true)}>
        <FileInput /> Importar
      </Button>
      <DialogoImportar isAberto={isAberto} onMudarAberto={setIsAberto} {...props} />
    </>
  )
}
