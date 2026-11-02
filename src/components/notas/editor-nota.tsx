import { useState, type ReactNode } from 'react'
import { Trash2 } from 'lucide-react'
import { cn } from 'cn'
import { PainelAnexos } from '@/components/anexos/painel-anexos'
import { CaminhoDoVinculo } from '@/components/notas/caminho-do-vinculo'
import { VincularA } from '@/components/notas/vincular-a'
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
import { Textarea } from '@/components/ui/textarea'
import { atualizarNota, excluirNota, vincularNota } from '@/db/repositories/note-repository'
import type { Note, Vinculo } from '@/db/types'
import { useDonoDoVinculo } from '@/hooks/use-notas-vinculadas'
import { useSalvarComAtraso } from '@/hooks/use-salvar-com-atraso'
import { TAMANHO_MAXIMO_TITULO } from '@/lib/esquemas'
import { tituloDaNota } from '@/lib/notas'

interface EditorNotaProps {
  nota: Note
  /** `pagina` (aba Notas) ou `painel` (gaveta lateral, mais compacto). */
  variante: 'pagina' | 'painel'
  /** À esquerda do "Salvo" (ex.: voltar para a lista). */
  inicio?: ReactNode
  /** Depois de excluir (a nota já não existe). */
  onExcluida: () => void
  /** Depois de trocar ou tirar o vínculo. */
  onVinculoTrocado?: (vinculo: Vinculo | undefined) => void
}

/**
 * O editor de nota do app (aba Notas e gaveta): título e texto que se salvam sozinhos, a quem a
 * nota pertence ("Vincular a…", "Desvincular"), anexos e exclusão.
 */
export function EditorNota({
  nota,
  variante,
  inicio,
  onExcluida,
  onVinculoTrocado,
}: EditorNotaProps) {
  const [isConfirmando, setIsConfirmando] = useState(false)
  const dono = useDonoDoVinculo(nota.vinculo)
  const titulo = useSalvarComAtraso(nota.titulo, (valor) =>
    atualizarNota(nota.id, { titulo: valor }),
  )
  const conteudo = useSalvarComAtraso(nota.conteudo, (valor) =>
    atualizarNota(nota.id, { conteudo: valor }),
  )
  const isSalvando = titulo.isPendente || conteudo.isPendente
  const isPainel = variante === 'painel'
  const idAnexos = `anexos-nota-${nota.id}`

  async function handleExcluir() {
    await excluirNota(nota.id)
    onExcluida()
  }

  async function handleVincular(vinculo: Vinculo | undefined) {
    await vincularNota(nota.id, vinculo)
    onVinculoTrocado?.(vinculo)
  }

  return (
    <>
      <div className="flex items-baseline justify-between gap-4">
        {inicio ?? <span />}
        <span aria-live="polite" className="text-sm text-grafite">
          {isSalvando ? 'Salvando…' : 'Salvo'}
        </span>
      </div>

      <label className="mt-2 block">
        <span className="sr-only">Título da nota</span>
        <input
          value={titulo.valor}
          onChange={(evento) => titulo.mudar(evento.target.value)}
          maxLength={TAMANHO_MAXIMO_TITULO}
          placeholder={tituloDaNota({ titulo: '', conteudo: conteudo.valor })}
          className={cn(
            'w-full bg-transparent font-extrabold tracking-[-0.02em] [font-stretch:80%] placeholder:text-grafite/60 focus:outline-none',
            isPainel ? 'text-2xl' : 'text-4xl',
          )}
        />
      </label>

      <div
        role="group"
        aria-label="Vínculo da nota"
        className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-y border-pauta py-1.5 text-sm"
      >
        {/* Na gaveta o caminho já está no topo; aqui ficam só as ações. */}
        {dono && !isPainel ? <CaminhoDoVinculo dono={dono} isComLinks /> : <span />}
        <VincularA
          atual={dono?.tipo === 'avulsa' ? undefined : nota.vinculo}
          onVincular={handleVincular}
        />
      </div>

      <label className="mt-4 block">
        <span className="sr-only">Texto da nota</span>
        <Textarea
          autoFocus={isPainel}
          value={conteudo.valor}
          onChange={(evento) => conteudo.mudar(evento.target.value)}
          placeholder="Escreva aqui"
          className={cn(
            'resize-y border-pauta bg-papel text-base leading-relaxed',
            isPainel ? 'min-h-48' : 'min-h-64',
          )}
        />
      </label>

      <section aria-labelledby={idAnexos} className={isPainel ? 'mt-6' : 'mt-8'}>
        <h2 id={idAnexos} className={cn('mb-3 font-bold', isPainel ? 'text-base' : 'text-xl')}>
          Anexos
        </h2>
        <PainelAnexos dono={{ tipo: 'note', id: nota.id }} descricaoDono="da nota" />
      </section>

      <Button
        variant="ghost"
        className={cn('text-grafite', isPainel ? 'mt-6' : 'mt-10')}
        onClick={() => setIsConfirmando(true)}
      >
        <Trash2 /> Excluir nota…
      </Button>

      <AlertDialog open={isConfirmando} onOpenChange={setIsConfirmando}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir “{tituloDaNota(nota)}”?</AlertDialogTitle>
            <AlertDialogDescription>
              A nota e os anexos dela (fotos, desenhos, áudios e links) serão apagados de vez.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => void handleExcluir()}>
              Excluir nota
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
