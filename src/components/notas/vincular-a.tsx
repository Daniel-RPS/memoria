import { useState } from 'react'
import { CircleCheck, Link2, ListChecks, Search, SquareCheck, Unlink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { Vinculo } from '@/db/types'
import { useAlvosParaVincular } from '@/hooks/use-notas-vinculadas'
import { diaCurto } from '@/lib/grupos'
import { mesmoVinculo } from '@/lib/notas'

const ICONE = { tarefa: CircleCheck, grupo: ListChecks, item: SquareCheck }
const NOME = { tarefa: 'Tarefa', grupo: 'Grupo', item: 'Item' }

interface VincularAProps {
  atual: Vinculo | undefined
  onVincular: (vinculo: Vinculo | undefined) => void
}

/** "Vincular a…" (busca tarefas, grupos e itens) e "Desvincular" (vira nota avulsa). */
export function VincularA({ atual, onVincular }: VincularAProps) {
  const [isAberto, setIsAberto] = useState(false)
  const [termo, setTermo] = useState('')
  const alvos = useAlvosParaVincular(termo, isAberto)

  function handleEscolher(vinculo: Vinculo) {
    setIsAberto(false)
    setTermo('')
    if (!mesmoVinculo(vinculo, atual)) onVincular(vinculo)
  }

  return (
    <div className="flex flex-wrap gap-1">
      <Popover open={isAberto} onOpenChange={setIsAberto}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="text-grafite">
            <Link2 /> {atual ? 'Trocar vínculo…' : 'Vincular a…'}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" collisionPadding={8} className="w-80 p-0">
          <label className="relative block border-b border-pauta">
            <span className="sr-only">Buscar tarefa, grupo ou item</span>
            <Search
              aria-hidden
              className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-grafite"
            />
            <Input
              autoFocus
              type="search"
              value={termo}
              onChange={(evento) => setTermo(evento.target.value)}
              placeholder="Tarefa, grupo ou item"
              className="h-10 rounded-none border-0 bg-transparent pl-9 shadow-none focus-visible:ring-0"
            />
          </label>
          <ul aria-label="Onde vincular" className="max-h-72 overflow-y-auto py-1">
            {alvos.length === 0 && (
              <li className="px-3 py-3 text-sm text-grafite">Nada encontrado.</li>
            )}
            {alvos.map((alvo) => {
              const Icone = ICONE[alvo.vinculo.tipo]
              const isAtual = mesmoVinculo(alvo.vinculo, atual)
              return (
                <li key={`${alvo.vinculo.tipo}:${alvo.vinculo.id}`}>
                  <button
                    type="button"
                    onClick={() => handleEscolher(alvo.vinculo)}
                    aria-current={isAtual || undefined}
                    className="flex w-full items-start gap-2 px-3 py-1.5 text-left text-sm hover:bg-accent focus-visible:bg-accent focus-visible:outline-none aria-[current]:text-caneta"
                  >
                    <Icone aria-hidden className="mt-0.5 size-4 shrink-0 text-grafite" />
                    <span className="min-w-0 flex-1">
                      <span className="sr-only">{NOME[alvo.vinculo.tipo]} </span>
                      <span className="break-words">{alvo.titulo}</span>
                      {alvo.contexto && (
                        <span className="block text-xs text-grafite">{alvo.contexto}</span>
                      )}
                    </span>
                    {alvo.data && (
                      <span className="pt-0.5 text-xs text-grafite tabular-nums">
                        {diaCurto(alvo.data)}
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        </PopoverContent>
      </Popover>
      {atual && (
        <Button
          variant="ghost"
          size="sm"
          className="text-grafite"
          onClick={() => onVincular(undefined)}
        >
          <Unlink /> Desvincular
        </Button>
      )}
    </div>
  )
}
