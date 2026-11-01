import type { ReactNode } from 'react'

interface CabecalhoPaginaProps {
  titulo: string
  /** Uma ou duas frases sob o título, em cinza. */
  descricao?: ReactNode
  /** Botão principal da tela (ex.: "Nova nota"), à direita do título. */
  acao?: ReactNode
}

/**
 * Cabeçalho das telas de lista (Procedimentos, Notas, Categorias, Backup): título condensado
 * e o traço grafite que separa o cabeçalho do conteúdo, como na folha do Dia e da Semana.
 */
export function CabecalhoPagina({ titulo, descricao, acao }: CabecalhoPaginaProps) {
  return (
    <header className="border-b-2 border-tinta pb-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-4xl font-extrabold tracking-[-0.02em] [font-stretch:80%]">{titulo}</h1>
        {acao}
      </div>
      {descricao && <p className="mt-2 max-w-prose text-grafite">{descricao}</p>}
    </header>
  )
}
