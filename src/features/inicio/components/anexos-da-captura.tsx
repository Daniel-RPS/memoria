import { useRef, type ChangeEvent } from 'react'
import { Camera, Link2, Paperclip, X } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { AnexoDaCaptura } from '@/db/repositories/captura-repository'
import { nomePadrao } from '@/lib/anexos'
import { reduzirImagem } from '@/lib/imagem'

interface BotaoAnexarProps {
  onAdicionar: (anexos: AnexoDaCaptura[]) => void
  /** Abre o diálogo de link (fica fora do formulário da captura). */
  onPedirLink: () => void
}

/** Clipe que anexa foto (ou imagem do computador) ou link à tarefa que vai ser criada. */
export function BotaoAnexar({ onAdicionar, onPedirLink }: BotaoAnexarProps) {
  const entradaRef = useRef<HTMLInputElement>(null)

  async function handleFotos(evento: ChangeEvent<HTMLInputElement>) {
    const arquivos = [...(evento.target.files ?? [])]
    evento.target.value = ''
    const fotos = await Promise.all(
      arquivos.map(async (arquivo) => ({
        tipo: 'foto' as const,
        nome: nomePadrao('foto', new Date()),
        blob: await reduzirImagem(arquivo),
      })),
    )
    onAdicionar(fotos)
  }

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger
          aria-label="Anexar"
          title="Anexar"
          className="flex size-8 items-center justify-center rounded-md text-grafite outline-none hover:bg-accent hover:text-tinta focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Paperclip aria-hidden className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => entradaRef.current?.click()}>
            <Camera aria-hidden /> Foto ou imagem…
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onPedirLink}>
            <Link2 aria-hidden /> Link…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <input
        ref={entradaRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        aria-label="Escolher fotos"
        onChange={(evento) => void handleFotos(evento)}
      />
    </>
  )
}

interface AnexosEscolhidosProps {
  anexos: AnexoDaCaptura[]
  onRemover: (indice: number) => void
}

/** Anexos que vão junto com a tarefa, cada um com × para tirar. */
export function AnexosEscolhidos({ anexos, onRemover }: AnexosEscolhidosProps) {
  if (anexos.length === 0) return null
  return (
    <ul aria-label="Anexos da nova tarefa" className="mt-3 ml-9 flex flex-wrap gap-1.5">
      {anexos.map((anexo, indice) => (
        <li
          key={`${anexo.nome}-${indice}`}
          className="flex h-7 items-center gap-1.5 rounded-full border border-pauta bg-nevoa pr-1 pl-2.5 text-xs"
        >
          {anexo.tipo === 'foto' ? (
            <Camera aria-hidden className="size-3.5 text-grafite" />
          ) : (
            <Link2 aria-hidden className="size-3.5 text-grafite" />
          )}
          <span className="max-w-48 truncate">{anexo.nome}</span>
          <button
            type="button"
            aria-label={`Tirar ${anexo.nome}`}
            onClick={() => onRemover(indice)}
            className="flex size-5 items-center justify-center rounded-full text-grafite hover:bg-pauta hover:text-tinta"
          >
            <X aria-hidden className="size-3" />
          </button>
        </li>
      ))}
    </ul>
  )
}
