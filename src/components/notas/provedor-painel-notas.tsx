import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, Plus } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { CaminhoDoVinculo } from '@/components/notas/caminho-do-vinculo'
import { EditorNota } from '@/components/notas/editor-nota'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  criarNota,
  descartarSeVazia,
  listarNotasDe,
  obterNota,
} from '@/db/repositories/note-repository'
import type { Vinculo } from '@/db/types'
import { ContextoPainelNotas, type PainelDeNotas } from '@/hooks/contexto-painel-notas'
import { useContagemDeNotas, useDonoDoVinculo, useNotasDe } from '@/hooks/use-notas-vinculadas'
import { previaDaNota, textoQuantasNotas, tituloDaNota } from '@/lib/notas'

interface EstadoDoPainel {
  vinculo: Vinculo
  /** Nota aberta no editor; sem ela, a lista de notas do alvo. */
  notaId?: string
}

/**
 * Dá a qualquer tela o `abrir(vinculo)` das notas e desenha a gaveta lateral: as notas da
 * tarefa, grupo ou item, ou o editor de uma delas (o mesmo da aba Notas).
 */
export function ProvedorPainelNotas({ children }: { children: ReactNode }) {
  const contagem = useContagemDeNotas()
  const [estado, setEstado] = useState<EstadoDoPainel | null>(null)
  const [isAberto, setIsAberto] = useState(false)
  /** Nota criada por "Adicionar nota": some ao sair se ficou em branco. */
  const criadaRef = useRef<string | null>(null)

  const descartarCriada = useCallback(() => {
    if (criadaRef.current) void descartarSeVazia(criadaRef.current)
    criadaRef.current = null
  }, [])

  const abrir = useCallback<PainelDeNotas['abrir']>(
    async (vinculo, opcoes) => {
      descartarCriada()
      if (opcoes?.criar) {
        const nota = await criarNota({ vinculo })
        criadaRef.current = nota.id
        setEstado({ vinculo, notaId: nota.id })
      } else {
        const notas = await listarNotasDe(vinculo)
        setEstado({ vinculo, notaId: notas.length === 1 ? notas[0].id : undefined })
      }
      setIsAberto(true)
    },
    [descartarCriada],
  )

  const valor = useMemo(() => ({ abrir, contagem }), [abrir, contagem])

  function handleMudarAberto(aberto: boolean) {
    setIsAberto(aberto)
    if (!aberto) descartarCriada()
  }

  return (
    <ContextoPainelNotas.Provider value={valor}>
      {children}
      <Sheet open={isAberto} onOpenChange={handleMudarAberto}>
        <SheetContent
          side="right"
          className="w-full gap-0 overflow-y-auto border-pauta bg-papel data-[side=right]:sm:max-w-md"
        >
          {estado && (
            <ConteudoDoPainel
              estado={estado}
              onAbrirNota={(notaId) => setEstado({ ...estado, notaId })}
              onVoltar={() => {
                descartarCriada()
                setEstado({ vinculo: estado.vinculo })
              }}
              onNova={() => void abrir(estado.vinculo, { criar: true })}
              onFechar={() => handleMudarAberto(false)}
              onVinculoTrocado={(vinculo) => {
                criadaRef.current = null
                // Desvinculada: a nota fica aberta, mas já não é deste alvo.
                if (!vinculo) handleMudarAberto(false)
                else setEstado({ vinculo, notaId: estado.notaId })
              }}
            />
          )}
        </SheetContent>
      </Sheet>
    </ContextoPainelNotas.Provider>
  )
}

interface ConteudoDoPainelProps {
  estado: EstadoDoPainel
  onAbrirNota: (notaId: string) => void
  onVoltar: () => void
  onNova: () => void
  onFechar: () => void
  onVinculoTrocado: (vinculo: Vinculo | undefined) => void
}

function ConteudoDoPainel({
  estado,
  onAbrirNota,
  onVoltar,
  onNova,
  onFechar,
  onVinculoTrocado,
}: ConteudoDoPainelProps) {
  const dono = useDonoDoVinculo(estado.vinculo)
  const { notas } = useNotasDe(estado.vinculo)
  const nota = useLiveQuery(
    async () => (estado.notaId ? ((await obterNota(estado.notaId)) ?? null) : null),
    [estado.notaId],
  )

  return (
    <>
      <SheetHeader className="border-b-2 border-tinta px-5 pt-5 pr-12 pb-3">
        <SheetTitle className="text-xl font-extrabold tracking-[-0.01em] [font-stretch:85%]">
          Notas
        </SheetTitle>
        <SheetDescription asChild>
          <div className="text-sm">
            {dono && <CaminhoDoVinculo dono={dono} variante="cabecalho" />}
          </div>
        </SheetDescription>
      </SheetHeader>

      <div className="flex-1 px-5 pt-3 pb-8">
        {estado.notaId && nota ? (
          <EditorNota
            key={nota.id}
            nota={nota}
            variante="painel"
            inicio={
              notas.length > 1 ? (
                <button
                  type="button"
                  onClick={onVoltar}
                  className="-ml-1 inline-flex items-center gap-0.5 rounded-sm text-sm text-grafite hover:text-tinta focus-visible:outline-2 focus-visible:outline-caneta"
                >
                  <ChevronLeft aria-hidden className="size-4" />
                  Todas as notas ({notas.length})
                </button>
              ) : undefined
            }
            onExcluida={() => (notas.length > 1 ? onVoltar() : onFechar())}
            onVinculoTrocado={onVinculoTrocado}
          />
        ) : (
          <>
            <p className="text-sm text-grafite">{textoQuantasNotas(notas.length)}</p>
            <ul aria-label="Notas do vínculo" className="mt-2 border-t border-pauta">
              {notas.map((item) => {
                const previa = previaDaNota(item)
                return (
                  <li key={item.id} className="border-b border-pauta">
                    <button
                      type="button"
                      onClick={() => onAbrirNota(item.id)}
                      className="block w-full px-1 py-2.5 text-left hover:bg-accent/50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-caneta"
                    >
                      <span className="block font-semibold break-words">{tituloDaNota(item)}</span>
                      {previa && (
                        <span className="mt-0.5 line-clamp-2 text-sm text-grafite">{previa}</span>
                      )}
                      <span className="mt-1 block text-xs text-grafite">
                        editada{' '}
                        {formatDistanceToNow(parseISO(item.atualizadoEm), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
            <Button variant="ghost" className="mt-3 text-grafite" onClick={onNova}>
              <Plus /> Nova nota
            </Button>
          </>
        )}
      </div>
    </>
  )
}
