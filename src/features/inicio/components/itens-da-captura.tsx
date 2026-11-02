import { useImperativeHandle, type Ref } from 'react'
import { cn } from 'cn'
import { useLinhasDeItens } from '@/features/inicio/hooks/use-linhas-de-itens'

/** Para quem monta a lista pôr o foco nela (Ctrl+K, troca de modo, grupo escolhido). */
export interface ItensDaCapturaHandle {
  focar: () => void
}

interface ItensDaCapturaProps {
  ref?: Ref<ItensDaCapturaHandle>
  /** Só no modo Grupo: a linha do nome, em destaque, acima dos itens. */
  nome?: { valor: string; onMudar: (valor: string) => void; isInvalido: boolean }
  itens: string[]
  onMudarItens: (itens: string[]) => void
  isItensInvalidos: boolean
  /** Ctrl+Enter de qualquer linha. */
  onCriar: () => void
  /** Id da mensagem de erro, ligada ao campo inválido. */
  idErro: string
}

/**
 * Grupo novo com os itens dentro (nome em destaque e uma linha com caixinha por item) ou só os
 * itens em "Em grupo…". A caixinha é a mesma dos itens nos cards, mas só ilustra: não marca nada.
 */
export function ItensDaCaptura({
  ref,
  nome,
  itens,
  onMudarItens,
  isItensInvalidos,
  onCriar,
  idErro,
}: ItensDaCapturaProps) {
  const {
    nomeRef,
    registrarLinha,
    focarInicio,
    handleKeyDownNoNome,
    handleKeyDownNoItem,
    handlePasteNoItem,
  } = useLinhasDeItens({ itens, onMudarItens, temNome: Boolean(nome), onCriar })
  useImperativeHandle(ref, () => ({ focar: focarInicio }))

  return (
    <div>
      {nome && (
        <input
          ref={nomeRef}
          value={nome.valor}
          onChange={(evento) => nome.onMudar(evento.target.value)}
          onKeyDown={handleKeyDownNoNome}
          autoComplete="off"
          aria-label="Nome do grupo"
          aria-invalid={nome.isInvalido || undefined}
          aria-describedby={nome.isInvalido ? idErro : undefined}
          aria-keyshortcuts="Control+K N"
          className="h-9 w-full min-w-0 bg-transparent text-2xl leading-9 font-semibold tracking-[-0.02em] caret-caneta outline-none"
        />
      )}
      <ul aria-label="Itens do grupo" className={cn(nome && 'mt-1')}>
        {itens.map((item, indice) => (
          <li
            // A posição é a identidade da linha: o foco anda por índice.
            key={indice}
            className="flex h-9 items-center gap-2.5 border-b border-pauta transition-colors duration-150 focus-within:border-caneta/60 motion-reduce:transition-none"
          >
            <span
              aria-hidden
              className="size-5 shrink-0 rounded-[4px] border-[1.5px] border-tinta/45 bg-papel"
            />
            <input
              ref={registrarLinha(indice)}
              value={item}
              onChange={(evento) => onMudarItens(itens.with(indice, evento.target.value))}
              onKeyDown={(evento) => handleKeyDownNoItem(indice, evento)}
              onPaste={(evento) => handlePasteNoItem(indice, evento)}
              autoComplete="off"
              aria-label="Item do grupo"
              aria-invalid={isItensInvalidos || undefined}
              aria-describedby={isItensInvalidos ? idErro : undefined}
              className="h-full min-w-0 flex-1 bg-transparent text-base caret-caneta outline-none"
            />
          </li>
        ))}
      </ul>
    </div>
  )
}
