import { LayoutGrid, List, Plus, type LucideIcon } from 'lucide-react'
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form'
import { cn } from 'cn'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { ValoresProcedimento } from '@/lib/esquema-procedimento'
import { LinhaEtapa } from '@/features/procedimentos/components/linha-etapa'
import { useModoEtapas, type ModoEtapas } from '@/features/procedimentos/hooks/use-modo-etapas'

function idDaEtapa(id: string) {
  return `etapa-${id}`
}

function novaEtapa() {
  return { id: crypto.randomUUID(), texto: '' }
}

const OPCOES_DE_MODO: { modo: ModoEtapas; rotulo: string; Icone: LucideIcon }[] = [
  { modo: 'lista', rotulo: 'Lista', Icone: List },
  { modo: 'cartoes', rotulo: 'Cartões', Icone: LayoutGrid },
]

/** Etapas numeradas pela posição: excluir uma renumera as seguintes. */
export function EditorEtapas() {
  const { modo, handleEscolherModo } = useModoEtapas()
  const { control, register, setValue } = useFormContext<ValoresProcedimento>()
  // `keyName` próprio: o padrão (`id`) esconderia o id da etapa.
  const { fields, append, insert, remove } = useFieldArray({
    control,
    name: 'etapas',
    keyName: 'chave',
  })
  const etapas = useWatch({ control, name: 'etapas' })

  // `append`/`insert` já focam a etapa nova.
  function handleAdicionar() {
    append(novaEtapa())
  }

  function handleApagarVazia(indice: number) {
    // A anterior (ou, na 1ª, a que sobe para o lugar dela), com o cursor no fim.
    const destino = fields[indice > 0 ? indice - 1 : indice + 1]
    remove(indice)
    if (!destino) return
    requestAnimationFrame(() => {
      const campo = document.getElementById(idDaEtapa(destino.id))
      if (!(campo instanceof HTMLTextAreaElement)) return
      campo.focus()
      campo.setSelectionRange(campo.value.length, campo.value.length)
    })
  }

  const isCartoes = modo === 'cartoes'

  return (
    <section aria-labelledby="titulo-etapas">
      <div className="flex items-center justify-between gap-2">
        <h2 id="titulo-etapas" className="text-lg font-bold">
          Etapas
        </h2>
        <div
          role="group"
          aria-label="Visualização das etapas"
          className="flex items-center rounded-md border border-pauta p-0.5"
        >
          {OPCOES_DE_MODO.map(({ modo: opcao, rotulo, Icone }) => {
            const isAtivo = modo === opcao
            return (
              <Tooltip key={opcao}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label={rotulo}
                    aria-pressed={isAtivo}
                    onClick={() => handleEscolherModo(opcao)}
                    className={cn(
                      'flex size-7 items-center justify-center rounded-[4px] text-grafite transition-colors hover:text-tinta focus-visible:outline-2 focus-visible:outline-caneta motion-reduce:transition-none',
                      isAtivo && 'bg-accent text-caneta hover:text-caneta',
                    )}
                  >
                    <Icone aria-hidden className="size-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>{rotulo}</TooltipContent>
              </Tooltip>
            )
          })}
        </div>
      </div>

      {fields.length === 0 ? (
        <p className="mt-1 text-sm text-grafite">
          Nenhuma etapa ainda. Adicione a primeira e escreva o que fazer nela.
        </p>
      ) : isCartoes ? (
        <ol
          aria-labelledby="titulo-etapas"
          className="mt-2 grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] items-stretch gap-3"
        >
          {fields.map((campo, indice) => (
            <LinhaEtapa
              key={campo.chave}
              id={idDaEtapa(campo.id)}
              numero={indice + 1}
              campo={register(`etapas.${indice}.texto`)}
              texto={etapas?.[indice]?.texto ?? ''}
              rotulo={etapas?.[indice]?.rotulo}
              onAlterarRotulo={(novo) => {
                setValue(`etapas.${indice}.rotulo`, novo || undefined, { shouldDirty: true })
              }}
              onCriarProxima={() => insert(indice + 1, novaEtapa())}
              onApagarVazia={() => handleApagarVazia(indice)}
              onExcluir={() => remove(indice)}
              variante="cartao"
            />
          ))}
          <li className="flex min-h-[140px]">
            <button
              type="button"
              onClick={handleAdicionar}
              className="flex w-full flex-col items-center justify-center gap-1.5 rounded-md border-2 border-dashed border-pauta bg-card/40 p-4 text-sm font-medium text-grafite transition-colors hover:border-caneta/50 hover:bg-accent/40 hover:text-tinta focus-visible:outline-2 focus-visible:outline-caneta"
            >
              <Plus className="size-5" />
              <span>Adicionar etapa</span>
            </button>
          </li>
        </ol>
      ) : (
        <ol
          aria-labelledby="titulo-etapas"
          className="mt-2 rounded-md border border-pauta bg-card px-3 py-1"
        >
          {fields.map((campo, indice) => (
            <LinhaEtapa
              key={campo.chave}
              id={idDaEtapa(campo.id)}
              numero={indice + 1}
              campo={register(`etapas.${indice}.texto`)}
              texto={etapas?.[indice]?.texto ?? ''}
              rotulo={etapas?.[indice]?.rotulo}
              onAlterarRotulo={(novo) => {
                setValue(`etapas.${indice}.rotulo`, novo || undefined, { shouldDirty: true })
              }}
              onCriarProxima={() => insert(indice + 1, novaEtapa())}
              onApagarVazia={() => handleApagarVazia(indice)}
              onExcluir={() => remove(indice)}
            />
          ))}
        </ol>
      )}

      {!isCartoes && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleAdicionar}
          className="mt-1 -ml-2 text-grafite hover:text-tinta"
        >
          <Plus /> Adicionar etapa
        </Button>
      )}
    </section>
  )
}
