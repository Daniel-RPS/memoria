import type { CSSProperties } from 'react'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Camera, Link2, Mic, PenLine, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router'
import { MenuDoCartao } from '@/components/menu-do-cartao'
import { CaminhoDoVinculo } from '@/components/notas/caminho-do-vinculo'
import type { TipoAnexo } from '@/db/types'
import { useAcoesDeArquivo } from '@/hooks/use-acoes-de-arquivo'
import { previaDaNota, tituloDaNota, type NotaComDono } from '@/lib/notas'

const ANEXOS: { tipo: TipoAnexo; Icone: LucideIcon; nome: string }[] = [
  { tipo: 'foto', Icone: Camera, nome: 'foto' },
  { tipo: 'desenho', Icone: PenLine, nome: 'desenho' },
  { tipo: 'audio', Icone: Mic, nome: 'áudio' },
  { tipo: 'link', Icone: Link2, nome: 'link' },
]

interface CartaoNotaProps {
  item: NotaComDono
  /** Cor da faixa (já ajustada para o tema); sem categoria = neutra. */
  cor: string
  tiposDeAnexo?: Set<TipoAnexo>
}

/**
 * Cartão da aba Notas: faixa na cor da categoria, título (ou 1ª linha), prévia de 2 linhas, a
 * quem pertence (com links para o Dia) e "editada há…" com os tipos de anexo. O cartão todo
 * abre a nota; os links do vínculo ficam por cima.
 */
export function CartaoNota({ item, cor, tiposDeAnexo }: CartaoNotaProps) {
  const { nota, dono } = item
  const previa = previaDaNota(nota)
  const anexos = ANEXOS.filter(({ tipo }) => tiposDeAnexo?.has(tipo))
  const { arquivarComAviso } = useAcoesDeArquivo()

  return (
    <article
      aria-label={tituloDaNota(nota)}
      className="group/cartao-menu relative flex h-full flex-col overflow-hidden rounded-md border border-pauta bg-card px-4 pt-3.5 pb-3 transition-colors focus-within:border-caneta/45 hover:border-caneta/45 hover:bg-accent/40 motion-reduce:transition-none"
      style={{ '--cor-do-cartao': cor } as CSSProperties}
    >
      <span aria-hidden className="absolute inset-x-0 top-0 h-[3px] bg-(--cor-do-cartao)" />
      <MenuDoCartao
        nome={tituloDaNota(nota)}
        onArquivar={() => void arquivarComAviso({ notas: [nota.id] }, ['nota'])}
      />
      <Link
        to={`/notas/${nota.id}`}
        className="line-clamp-2 pr-6 font-semibold leading-snug break-words outline-none after:absolute after:inset-0 after:rounded-md focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-caneta"
      >
        {tituloDaNota(nota)}
      </Link>
      {previa && (
        <p className="mt-1.5 line-clamp-2 text-sm leading-5 break-words text-grafite">{previa}</p>
      )}
      <CaminhoDoVinculo dono={dono} isComLinks className="mt-2.5 text-xs leading-5" />
      <p className="mt-auto flex items-center justify-between gap-2 pt-2.5 text-xs text-grafite">
        <span>
          editada{' '}
          {formatDistanceToNow(parseISO(nota.atualizadoEm), { addSuffix: true, locale: ptBR })}
        </span>
        {anexos.length > 0 && (
          <span
            aria-label={`Anexos: ${anexos.map(({ nome }) => nome).join(', ')}`}
            className="flex items-center gap-1.5"
          >
            {anexos.map(({ tipo, Icone }) => (
              <Icone key={tipo} aria-hidden className="size-3.5" />
            ))}
          </span>
        )}
      </p>
    </article>
  )
}
