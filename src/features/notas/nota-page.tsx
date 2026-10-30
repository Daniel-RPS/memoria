import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import { PainelAnexos } from '@/components/anexos/painel-anexos'
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
import { atualizarNota, excluirNota } from '@/db/repositories/note-repository'
import type { Note } from '@/db/types'
import { useSalvarComAtraso } from '@/hooks/use-salvar-com-atraso'
import { TAMANHO_MAXIMO_TITULO } from '@/lib/esquemas'
import { tituloDaNota } from '@/lib/notas'
import { useNota } from '@/features/notas/hooks/use-notas'

export function NotaPage() {
  const { id = '' } = useParams()
  const { nota, isCarregando } = useNota(id)

  if (isCarregando) return null
  if (!nota) return <Navigate to="/notas" replace />

  return <EditorNota key={nota.id} nota={nota} />
}

/** Título e texto que se salvam sozinhos, anexos e exclusão. */
function EditorNota({ nota }: { nota: Note }) {
  const navigate = useNavigate()
  const [isConfirmando, setIsConfirmando] = useState(false)
  const titulo = useSalvarComAtraso(nota.titulo, (valor) =>
    atualizarNota(nota.id, { titulo: valor }),
  )
  const conteudo = useSalvarComAtraso(nota.conteudo, (valor) =>
    atualizarNota(nota.id, { conteudo: valor }),
  )
  const isSalvando = titulo.isPendente || conteudo.isPendente

  async function handleExcluir() {
    await excluirNota(nota.id)
    navigate('/notas')
  }

  return (
    <>
      <div className="flex items-baseline justify-between gap-4">
        <Link to="/notas" className="text-sm text-grafite hover:text-tinta">
          Notas
        </Link>
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
          className="w-full bg-transparent text-4xl font-extrabold tracking-[-0.02em] [font-stretch:80%] placeholder:text-grafite/60 focus:outline-none"
        />
      </label>

      <label className="mt-6 block">
        <span className="sr-only">Texto da nota</span>
        <Textarea
          value={conteudo.valor}
          onChange={(evento) => conteudo.mudar(evento.target.value)}
          placeholder="Escreva aqui"
          className="min-h-64 resize-y border-pauta bg-papel text-base leading-relaxed"
        />
      </label>

      <section aria-labelledby="titulo-anexos-nota" className="mt-8">
        <h2 id="titulo-anexos-nota" className="mb-3 text-xl font-bold">
          Anexos
        </h2>
        <PainelAnexos dono={{ tipo: 'note', id: nota.id }} descricaoDono="da nota" />
      </section>

      <Button variant="ghost" className="mt-10 text-grafite" onClick={() => setIsConfirmando(true)}>
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
