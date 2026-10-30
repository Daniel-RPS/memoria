import { useRef, useState, type ChangeEvent } from 'react'
import { Camera, Link2, Mic, PenLine } from 'lucide-react'
import { toast } from 'sonner'
import { DialogoDesenho } from '@/components/anexos/dialogo-desenho'
import { DialogoLink } from '@/components/anexos/dialogo-link'
import { GravadorAudio } from '@/components/anexos/gravador-audio'
import { ItemAnexo } from '@/components/anexos/item-anexo'
import { Button } from '@/components/ui/button'
import {
  adicionarAnexo,
  excluirAnexo,
  restaurarAnexo,
  substituirConteudo,
} from '@/db/repositories/attachment-repository'
import type { Attachment, Dono } from '@/db/types'
import { useAnexos } from '@/hooks/use-anexos'
import { nomePadrao } from '@/lib/anexos'
import { reduzirImagem } from '@/lib/imagem'

interface PainelAnexosProps {
  dono: Dono
  /** Só mostra (sem adicionar nem excluir), como no modo execução. */
  isSomenteLeitura?: boolean
  /** Nome usado nos rótulos acessíveis, ex.: "da tarefa Pagar conta". */
  descricaoDono: string
}

/** Tempo do aviso com "Desfazer" depois de excluir um anexo. */
const DURACAO_AVISO_MS = 8000

/** Fotos, desenhos, áudios e links de uma tarefa, nota, procedimento ou passo. */
export function PainelAnexos({ dono, isSomenteLeitura, descricaoDono }: PainelAnexosProps) {
  const anexos = useAnexos(dono)
  const entradaFotoRef = useRef<HTMLInputElement>(null)
  const [isGravando, setIsGravando] = useState(false)
  const [isComLink, setIsComLink] = useState(false)
  const [desenho, setDesenho] = useState<{ isAberto: boolean; editando?: Attachment }>({
    isAberto: false,
  })
  const imagens = anexos.filter((anexo) => anexo.tipo === 'foto' || anexo.tipo === 'desenho')
  const outros = anexos.filter((anexo) => anexo.tipo === 'audio' || anexo.tipo === 'link')

  async function handleFotos(evento: ChangeEvent<HTMLInputElement>) {
    const arquivos = [...(evento.target.files ?? [])]
    evento.target.value = ''
    for (const arquivo of arquivos) {
      const reduzida = await reduzirImagem(arquivo)
      await adicionarAnexo({
        dono,
        tipo: 'foto',
        nome: nomePadrao('foto', new Date()),
        blob: reduzida,
      })
    }
  }

  async function handleSalvarDesenho(blob: Blob) {
    if (desenho.editando) await substituirConteudo(desenho.editando.id, blob)
    else
      await adicionarAnexo({ dono, tipo: 'desenho', nome: nomePadrao('desenho', new Date()), blob })
  }

  async function handleExcluir(anexo: Attachment) {
    const excluido = await excluirAnexo(anexo.id)
    if (!excluido) return
    toast(`${anexo.nome} excluído`, {
      duration: DURACAO_AVISO_MS,
      action: { label: 'Desfazer', onClick: () => void restaurarAnexo(excluido) },
    })
  }

  if (isSomenteLeitura && anexos.length === 0) return null

  return (
    <div className="flex flex-col gap-3">
      {imagens.length > 0 && (
        <ul aria-label={`Imagens ${descricaoDono}`} className="flex flex-wrap gap-3">
          {imagens.map((anexo) => (
            <ItemAnexo
              key={anexo.id}
              anexo={anexo}
              isSomenteLeitura={isSomenteLeitura}
              onExcluir={() => void handleExcluir(anexo)}
              onEditarDesenho={() => setDesenho({ isAberto: true, editando: anexo })}
            />
          ))}
        </ul>
      )}
      {outros.length > 0 && (
        <ul aria-label={`Áudios e links ${descricaoDono}`} className="flex flex-col gap-2">
          {outros.map((anexo) => (
            <ItemAnexo
              key={anexo.id}
              anexo={anexo}
              isSomenteLeitura={isSomenteLeitura}
              onExcluir={() => void handleExcluir(anexo)}
              onEditarDesenho={() => {}}
            />
          ))}
        </ul>
      )}

      {!isSomenteLeitura && (
        <>
          {isGravando && (
            <GravadorAudio
              onGravado={(audio) =>
                adicionarAnexo({
                  dono,
                  tipo: 'audio',
                  nome: nomePadrao('audio', new Date()),
                  blob: audio,
                })
              }
              onFechar={() => setIsGravando(false)}
            />
          )}
          <div role="group" aria-label={`Anexar ${descricaoDono}`} className="flex flex-wrap gap-1">
            <input
              ref={entradaFotoRef}
              type="file"
              accept="image/*"
              multiple
              aria-label={`Escolher fotos ${descricaoDono}`}
              className="sr-only"
              onChange={(evento) => void handleFotos(evento)}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-grafite"
              onClick={() => entradaFotoRef.current?.click()}
            >
              <Camera /> Foto
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-grafite"
              onClick={() => setDesenho({ isAberto: true })}
            >
              <PenLine /> Desenho
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-grafite"
              onClick={() => setIsGravando(true)}
              disabled={isGravando}
            >
              <Mic /> Áudio
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-grafite"
              onClick={() => setIsComLink(true)}
            >
              <Link2 /> Link
            </Button>
          </div>
          <DialogoDesenho
            isAberto={desenho.isAberto}
            onMudarAberto={(isAberto) => setDesenho(isAberto ? desenho : { isAberto: false })}
            inicial={desenho.editando?.blob}
            onSalvar={handleSalvarDesenho}
          />
          <DialogoLink
            isAberto={isComLink}
            onMudarAberto={setIsComLink}
            onSalvar={(link) =>
              adicionarAnexo({ dono, tipo: 'link', nome: link.nome, url: link.url.trim() })
            }
          />
        </>
      )}
    </div>
  )
}
