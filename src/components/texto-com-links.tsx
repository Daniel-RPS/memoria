import { useMemo, type KeyboardEvent, type SyntheticEvent } from 'react'
import { cn } from 'cn'
import { separarLinks } from '@/domain/links'

interface TextoComLinksProps {
  /** Texto como foi salvo; nada é alterado, só os endereços viram links na tela. */
  texto: string
  className?: string
}

/** Estilo do link no texto: cor de destaque, sublinhado e quebra de URL longa. */
export const CLASSE_LINK_NO_TEXTO =
  'rounded-sm text-caneta underline decoration-caneta/60 underline-offset-2 [overflow-wrap:anywhere] hover:text-violeta-profundo hover:decoration-violeta-profundo focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-caneta'

/** O link abre o site sem acionar o elemento em volta (abrir, concluir, editar, arrastar). */
function handleIsolar(evento: SyntheticEvent) {
  evento.stopPropagation()
}

/** Só Enter e Espaço param aqui (atalhos como Ctrl+Z seguem para o app). */
function handleTeclaNoLink(evento: KeyboardEvent<HTMLAnchorElement>) {
  if (evento.key === 'Enter' || evento.key === ' ') evento.stopPropagation()
}

/**
 * Mostra um texto com os endereços de site clicáveis (nova aba).
 * Sem `className` não cria contêiner: herda quebras de linha e espaçamento de quem o envolve.
 */
export function TextoComLinks({ texto, className }: TextoComLinksProps) {
  const pedacos = useMemo(() => separarLinks(texto), [texto])

  const conteudo = pedacos.map((pedaco, indice) =>
    pedaco.tipo === 'texto' ? (
      pedaco.texto
    ) : (
      <a
        key={indice}
        href={pedaco.href}
        target="_blank"
        rel="noopener noreferrer"
        title={pedaco.href}
        draggable={false}
        onClick={handleIsolar}
        onPointerDown={handleIsolar}
        onMouseDown={handleIsolar}
        onTouchStart={handleIsolar}
        onKeyDown={handleTeclaNoLink}
        className={CLASSE_LINK_NO_TEXTO}
      >
        {pedaco.texto}
      </a>
    ),
  )

  if (className) return <span className={cn(className)}>{conteudo}</span>
  return <>{conteudo}</>
}
