import { useEffect, useRef, type ChangeEvent, type KeyboardEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { Search, X } from 'lucide-react'
import { cn } from 'cn'
import { DicaDaBarra } from '@/app/dica-da-barra'
import { classesDoItemDaBarra } from '@/app/estilo-item-da-barra'
import type { DestinoDaBarra } from '@/lib/busca-da-barra'

interface BuscaDaBarraProps {
  isRecolhida: boolean
  onAlternarRecolhida: () => void
  consulta: string
  onMudarConsulta: (valor: string) => void
  destinosFiltrados: DestinoDaBarra[]
}

export function BuscaDaBarra({
  isRecolhida,
  onAlternarRecolhida,
  consulta,
  onMudarConsulta,
  destinosFiltrados,
}: BuscaDaBarraProps) {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const itensRefs = useRef<(HTMLAnchorElement | null)[]>([])
  const deveFocarAoExpandir = useRef(false)

  // Tecla "/" fora de campos de texto foca a busca
  useEffect(() => {
    function handleKeyDownGlobal(e: globalThis.KeyboardEvent) {
      if (e.key === '/') {
        const elementoAtivo = document.activeElement
        const isEmCampoDeTexto =
          elementoAtivo instanceof HTMLInputElement ||
          elementoAtivo instanceof HTMLTextAreaElement ||
          elementoAtivo?.getAttribute('contenteditable') === 'true'

        if (!isEmCampoDeTexto) {
          e.preventDefault()
          if (isRecolhida) {
            deveFocarAoExpandir.current = true
            onAlternarRecolhida()
          } else {
            inputRef.current?.focus()
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDownGlobal)
    return () => {
      window.removeEventListener('keydown', handleKeyDownGlobal)
    }
  }, [isRecolhida, onAlternarRecolhida])

  // Focar campo assim que expandir se solicitado
  useEffect(() => {
    if (!isRecolhida && deveFocarAoExpandir.current) {
      deveFocarAoExpandir.current = false
      inputRef.current?.focus()
    }
  }, [isRecolhida])

  function handleBotaoRecolhidaClick() {
    deveFocarAoExpandir.current = true
    onAlternarRecolhida()
  }

  function handleLimpar() {
    onMudarConsulta('')
    inputRef.current?.focus()
  }

  function handleKeyDownInput(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (destinosFiltrados.length > 0) {
        const primeiro = destinosFiltrados[0]
        onMudarConsulta('')
        navigate(primeiro.para)
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (destinosFiltrados.length > 0) {
        itensRefs.current[0]?.focus()
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      if (consulta) {
        onMudarConsulta('')
      } else {
        inputRef.current?.blur()
      }
    }
  }

  function handleKeyDownResultado(e: KeyboardEvent<HTMLAnchorElement>, indice: number) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault()
      const proximo = (indice + 1) % destinosFiltrados.length
      itensRefs.current[proximo]?.focus()
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault()
      if (indice === 0 && (e.key === 'ArrowUp' || e.key === 'ArrowLeft')) {
        inputRef.current?.focus()
      } else {
        const anterior = (indice - 1 + destinosFiltrados.length) % destinosFiltrados.length
        itensRefs.current[anterior]?.focus()
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onMudarConsulta('')
      inputRef.current?.focus()
    }
  }

  if (isRecolhida) {
    return (
      <div className="mb-3">
        <DicaDaBarra texto="Buscar">
          <button
            type="button"
            aria-label="Buscar"
            onClick={handleBotaoRecolhidaClick}
            className="flex size-8 w-full items-center justify-center rounded-md border border-barra-borda bg-transparent text-barra-suave transition-colors hover:bg-barra-realce hover:text-barra-texto focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-barra-texto motion-reduce:transition-none"
          >
            <Search aria-hidden className="size-4" />
          </button>
        </DicaDaBarra>
      </div>
    )
  }

  const temTexto = consulta.length > 0

  return (
    <div className="mb-3">
      <div className="relative flex h-8 items-center rounded-md border border-barra-borda bg-transparent transition-colors hover:bg-barra-realce focus-within:border-barra-texto/40 focus-within:bg-barra-realce motion-reduce:transition-none">
        <Search
          aria-hidden
          className="pointer-events-none absolute left-2 size-4 text-barra-suave"
        />
        <input
          ref={inputRef}
          type="search"
          aria-label="Buscar telas"
          placeholder="Buscar"
          value={consulta}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onMudarConsulta(e.target.value)}
          onKeyDown={handleKeyDownInput}
          className="h-full w-full rounded-md bg-transparent pr-7 pl-8 text-sm text-barra-texto placeholder:text-barra-suave focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-barra-texto"
        />
        {temTexto && (
          <button
            type="button"
            aria-label="Limpar busca"
            onClick={handleLimpar}
            className="absolute right-1.5 flex size-5 items-center justify-center rounded text-barra-suave hover:text-barra-texto focus-visible:outline-2 focus-visible:outline-barra-texto"
          >
            <X aria-hidden className="size-3.5" />
          </button>
        )}
      </div>

      {temTexto && (
        <span className="sr-only" aria-live="polite">
          {destinosFiltrados.length === 1
            ? '1 resultado'
            : `${destinosFiltrados.length} resultados`}
        </span>
      )}

      {temTexto && (
        <nav
          aria-label="Resultados da busca"
          className="mt-2"
        >
          {destinosFiltrados.length === 0 ? (
            <p role="status" className="px-1 text-xs text-barra-suave">
              Nada encontrado
            </p>
          ) : (
            <div className="flex flex-wrap gap-1">
              {destinosFiltrados.map((destino, index) => {
                const Icone = destino.icone
                return (
                  <DicaDaBarra key={destino.para} texto={destino.nome}>
                    <Link
                      ref={(el) => {
                        itensRefs.current[index] = el
                      }}
                      to={destino.para}
                      aria-label={destino.nome}
                      aria-current={destino.isAtiva ? 'page' : undefined}
                      onClick={() => onMudarConsulta('')}
                      onKeyDown={(e) => handleKeyDownResultado(e, index)}
                      className={cn(
                        classesDoItemDaBarra(destino.isAtiva, true),
                        '!size-9 !h-9 !w-9 !p-0 justify-center shrink-0',
                      )}
                    >
                      <Icone aria-hidden className="size-[18px] shrink-0" />
                    </Link>
                  </DicaDaBarra>
                )
              })}
            </div>
          )}
        </nav>
      )}
    </div>
  )
}
