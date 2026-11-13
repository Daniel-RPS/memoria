import { useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { Camera, Link2, Mic, Paperclip, PenLine } from 'lucide-react'
import { toast } from 'sonner'
import { DialogoDesenho } from '@/components/anexos/dialogo-desenho'
import { DialogoLink } from '@/components/anexos/dialogo-link'
import { GravadorAudio } from '@/components/anexos/gravador-audio'
import { ItemAnexo } from '@/components/anexos/item-anexo'
import { ItemDocumento } from '@/components/anexos/item-documento'
import { Button } from '@/components/ui/button'
import {
  adicionarAnexo,
  excluirAnexo,
  restaurarAnexo,
  substituirConteudo,
} from '@/db/repositories/attachment-repository'
import type { Attachment, Dono } from '@/db/types'
import {
  DOCUMENTO_EXTENSOES,
  mimeTypePadrao,
  validarArquivoDocumento,
} from '@/domain/attachments'
import { useAnexos } from '@/hooks/use-anexos'
import { solicitarArmazenamentoPersistente } from '@/lib/armazenamento'
import { nomePadrao } from '@/lib/anexos'
import { reduzirImagem } from '@/lib/imagem'

interface PainelAnexosProps {
  dono: Dono
  /** Nome usado nos rótulos acessíveis, ex.: "da tarefa Pagar conta". */
  descricaoDono: string
}

/** Tempo do aviso com "Desfazer" depois de excluir um anexo. */
const DURACAO_AVISO_MS = 8000

/** Fotos, desenhos, áudios, links e documentos de uma tarefa ou nota. */
export function PainelAnexos({ dono, descricaoDono }: PainelAnexosProps) {
  const anexos = useAnexos(dono)
  const entradaFotoRef = useRef<HTMLInputElement>(null)
  const entradaDocRef = useRef<HTMLInputElement>(null)
  const [isGravando, setIsGravando] = useState(false)
  const [isComLink, setIsComLink] = useState(false)
  const [isAnexandoDoc, setIsAnexandoDoc] = useState(false)
  const [isArrastandoSobre, setIsArrastandoSobre] = useState(false)
  const [avisoErro, setAvisoErro] = useState<string | null>(null)
  const [desenho, setDesenho] = useState<{ isAberto: boolean; editando?: Attachment }>({
    isAberto: false,
  })

  const imagens = anexos.filter((anexo) => anexo.tipo === 'foto' || anexo.tipo === 'desenho')
  const documentos = anexos.filter((anexo) => anexo.tipo === 'documento')
  const outros = anexos.filter((anexo) => anexo.tipo === 'audio' || anexo.tipo === 'link')

  async function processarArquivosDocumento(arquivos: File[]) {
    if (arquivos.length === 0) return
    setAvisoErro(null)

    // Silenciosamente solicita persistência de armazenamento
    void solicitarArmazenamentoPersistente()

    const validos: { arquivo: File; extensao: string }[] = []
    const erros: string[] = []

    for (const arq of arquivos) {
      const validacao = validarArquivoDocumento({ name: arq.name, size: arq.size })
      if (validacao.isValido && validacao.extensao) {
        validos.push({ arquivo: arq, extensao: validacao.extensao })
      } else if (validacao.motivo) {
        erros.push(validacao.motivo)
      }
    }

    if (erros.length > 0) {
      setAvisoErro(erros.join(' '))
    }

    if (validos.length === 0) return

    setIsAnexandoDoc(true)
    try {
      for (const { arquivo, extensao } of validos) {
        const mime = arquivo.type || mimeTypePadrao(extensao)
        const blobComMime = arquivo.type ? arquivo : new Blob([arquivo], { type: mime })
        await adicionarAnexo({
          dono,
          tipo: 'documento',
          nome: arquivo.name,
          blob: blobComMime,
          extensao,
          tamanho: arquivo.size,
        })
      }
    } catch (erro) {
      const msg = erro instanceof Error ? erro.message : 'Erro ao anexar arquivo.'
      setAvisoErro(msg)
    } finally {
      setIsAnexandoDoc(false)
    }
  }

  async function handleDocs(evento: ChangeEvent<HTMLInputElement>) {
    const arquivos = [...(evento.target.files ?? [])]
    evento.target.value = ''
    await processarArquivosDocumento(arquivos)
  }

  function handleDragOver(evento: DragEvent) {
    if (evento.dataTransfer.types.includes('Files')) {
      evento.preventDefault()
      setIsArrastandoSobre(true)
    }
  }

  function handleDragLeave(evento: DragEvent) {
    if (!evento.currentTarget.contains(evento.relatedTarget as Node)) {
      setIsArrastandoSobre(false)
    }
  }

  async function handleDrop(evento: DragEvent) {
    evento.preventDefault()
    setIsArrastandoSobre(false)
    const arquivos = [...(evento.dataTransfer.files ?? [])]
    if (arquivos.length > 0) {
      await processarArquivosDocumento(arquivos)
    }
  }

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

  return (
    <div
      className={`flex flex-col gap-3 rounded-md transition-colors ${
        isArrastandoSobre ? 'border-2 border-dashed border-caneta bg-accent/30 p-2' : ''
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={(e) => void handleDrop(e)}
    >
      {avisoErro && (
        <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive">
          {avisoErro}
        </div>
      )}

      {documentos.length > 0 && (
        <ul aria-label={`Documentos ${descricaoDono}`} className="flex flex-col gap-2">
          {documentos.map((anexo) => (
            <ItemDocumento key={anexo.id} anexo={anexo} onExcluir={() => void handleExcluir(anexo)} />
          ))}
        </ul>
      )}

      {imagens.length > 0 && (
        <ul aria-label={`Imagens ${descricaoDono}`} className="flex flex-wrap gap-3">
          {imagens.map((anexo) => (
            <ItemAnexo
              key={anexo.id}
              anexo={anexo}
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
              onExcluir={() => void handleExcluir(anexo)}
              onEditarDesenho={() => {}}
            />
          ))}
        </ul>
      )}

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
          ref={entradaDocRef}
          type="file"
          accept={DOCUMENTO_EXTENSOES.join(',')}
          multiple
          aria-label={`Escolher documentos ${descricaoDono}`}
          className="sr-only"
          onChange={(evento) => void handleDocs(evento)}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-grafite"
          onClick={() => entradaDocRef.current?.click()}
          disabled={isAnexandoDoc}
        >
          <Paperclip /> {isAnexandoDoc ? 'Anexando…' : 'Documento'}
        </Button>

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
    </div>
  )
}
