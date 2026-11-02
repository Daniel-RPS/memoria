import { useLayoutEffect, useRef, type ClipboardEvent, type KeyboardEvent } from 'react'
import { colarNoItem, inserirItemDepois, removerItemVazio, type EdicaoDeItens } from '@/lib/captura'

interface UseLinhasDeItensProps {
  itens: string[]
  onMudarItens: (itens: string[]) => void
  /** Modo Grupo: há a linha do nome acima do 1º item (índice -1). */
  temNome: boolean
  onCriar: () => void
}

type Campo = HTMLInputElement | null

function isCriar(evento: KeyboardEvent) {
  return evento.key === 'Enter' && (evento.ctrlKey || evento.metaKey)
}

/**
 * Teclado da lista de itens da captura (as regras de cada edição estão em `lib/captura`):
 * Enter cria a próxima linha, Backspace num item vazio apaga a linha e sobe, ↑/↓ andam entre
 * as linhas (o nome é a linha -1), Ctrl+Enter cria e colar várias linhas gera um item por linha.
 */
export function useLinhasDeItens({ itens, onMudarItens, temNome, onCriar }: UseLinhasDeItensProps) {
  const nomeRef = useRef<HTMLInputElement>(null)
  const linhasRef = useRef<Campo[]>([])
  // A linha nova só existe depois de desenhar: o foco espera a lista mudar.
  const focoPendenteRef = useRef<Omit<EdicaoDeItens, 'itens'> | null>(null)

  function focar(indice: number, cursor?: number) {
    const campo = indice < 0 ? (temNome ? nomeRef.current : null) : linhasRef.current[indice]
    if (!campo) return
    campo.focus()
    const posicao = cursor ?? campo.value.length
    campo.setSelectionRange(posicao, posicao)
  }

  useLayoutEffect(() => {
    const pendente = focoPendenteRef.current
    if (!pendente) return
    focoPendenteRef.current = null
    focar(pendente.foco, pendente.cursor)
  })

  function aplicar({ itens: novos, foco, cursor }: EdicaoDeItens) {
    if (novos === itens) return focar(foco, cursor)
    focoPendenteRef.current = { foco, cursor }
    onMudarItens(novos)
  }

  function handleKeyDownNoNome(evento: KeyboardEvent<HTMLInputElement>) {
    if (evento.nativeEvent.isComposing) return
    if (isCriar(evento)) onCriar()
    else if (evento.key === 'Enter' || evento.key === 'ArrowDown') focar(0)
    else return
    evento.preventDefault()
  }

  function handleKeyDownNoItem(indice: number, evento: KeyboardEvent<HTMLInputElement>) {
    if (evento.nativeEvent.isComposing) return
    const isVazio = evento.currentTarget.value === ''
    if (isCriar(evento)) onCriar()
    else if (evento.key === 'Enter') aplicar(inserirItemDepois(itens, indice))
    else if (evento.key === 'ArrowUp') focar(indice - 1)
    else if (evento.key === 'ArrowDown') focar(indice + 1)
    else if (evento.key === 'Backspace' && isVazio) {
      const edicao = removerItemVazio(itens, indice)
      // Sem o nome (Em grupo…), apagar a 1ª linha deixa o foco na nova 1ª linha.
      if (edicao.foco < 0 && !temNome) {
        if (edicao.itens === itens) return
        aplicar({ ...edicao, foco: 0 })
      } else aplicar(edicao)
    } else return
    evento.preventDefault()
  }

  function handlePasteNoItem(indice: number, evento: ClipboardEvent<HTMLInputElement>) {
    const campo = evento.currentTarget
    const edicao = colarNoItem(itens, indice, evento.clipboardData.getData('text'), {
      inicio: campo.selectionStart ?? campo.value.length,
      fim: campo.selectionEnd ?? campo.value.length,
    })
    if (!edicao) return
    evento.preventDefault()
    aplicar(edicao)
  }

  /** Foco de quem chega (Ctrl+K, troca de modo, grupo escolhido): o nome ou o último item. */
  function focarInicio() {
    focar(temNome ? -1 : itens.length - 1)
  }

  return {
    nomeRef,
    registrarLinha: (indice: number) => (campo: Campo) => {
      linhasRef.current[indice] = campo
    },
    focarInicio,
    handleKeyDownNoNome,
    handleKeyDownNoItem,
    handlePasteNoItem,
  }
}
