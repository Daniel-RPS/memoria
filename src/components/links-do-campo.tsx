import { CLASSE_LINK_NO_TEXTO } from '@/components/texto-com-links'
import { linksUnicos, rotuloCurtoDoLink } from '@/domain/links'
import { cn } from 'cn'

interface LinksDoCampoProps {
  /** Texto do campo em edição (input/textarea não mostram link clicável). */
  texto: string
  className?: string
}

/** Linha "Links" com chips clicáveis dos endereços achados num campo de texto. Some sem links. */
export function LinksDoCampo({ texto, className }: LinksDoCampoProps) {
  const links = linksUnicos(texto)
  if (links.length === 0) return null

  return (
    <div className={cn('flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm', className)}>
      <span className="text-xs text-grafite">Links</span>
      {links.map((link) => (
        <a
          key={link.href}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          title={link.href}
          className={cn(
            CLASSE_LINK_NO_TEXTO,
            'rounded-full border border-pauta bg-card px-2 py-0.5 text-xs no-underline hover:border-caneta/45 hover:underline',
          )}
        >
          {rotuloCurtoDoLink(link.href)}
        </a>
      ))}
    </div>
  )
}
