import { Plus, Trash2 } from 'lucide-react'
import { useFieldArray, useFormContext } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { ValoresProcedimento } from '@/lib/esquema-procedimento'

/** Etapas numeradas pela posição: excluir uma renumera as seguintes. */
export function EditorEtapas() {
  const { control, register } = useFormContext<ValoresProcedimento>()
  // `keyName` próprio: o padrão (`id`) esconderia o id da etapa.
  const { fields, append, remove } = useFieldArray({ control, name: 'etapas', keyName: 'chave' })

  function handleAdicionar() {
    append({ id: crypto.randomUUID(), texto: '' })
  }

  return (
    <section aria-labelledby="titulo-etapas">
      <h2 id="titulo-etapas" className="text-xl font-bold">
        Etapas
      </h2>

      {fields.length === 0 ? (
        <p className="mt-3 text-grafite">
          Nenhuma etapa ainda. Adicione a primeira e escreva o que fazer nela.
        </p>
      ) : (
        <ol
          aria-labelledby="titulo-etapas"
          className="mt-3 rounded-md border border-pauta bg-papel"
        >
          {fields.map((campo, indice) => {
            const numero = indice + 1
            const idCampo = `etapa-${campo.id}`
            return (
              <li
                key={campo.chave}
                className="group/linha flex items-start gap-3 border-b border-pauta px-3 py-2 last:border-b-0 sm:gap-4 sm:px-4"
              >
                <label
                  htmlFor={idCampo}
                  className="flex w-14 shrink-0 flex-col items-end pt-1 leading-none select-none"
                >
                  <span className="text-xs text-grafite">Etapa</span>{' '}
                  <span className="text-3xl font-extrabold tabular-nums [font-stretch:75%]">
                    {numero}
                  </span>
                </label>
                <Textarea
                  id={idCampo}
                  rows={1}
                  {...register(`etapas.${indice}.texto`)}
                  placeholder="O que fazer nesta etapa"
                  className="min-h-0 resize-none border-transparent bg-transparent px-2 py-2 text-base shadow-none hover:border-pauta md:text-base"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Excluir etapa ${numero}`}
                  onClick={() => remove(indice)}
                  className="mt-1 text-grafite opacity-60 group-hover/linha:opacity-100 focus-visible:opacity-100"
                >
                  <Trash2 />
                </Button>
              </li>
            )
          })}
        </ol>
      )}

      <Button type="button" variant="outline" onClick={handleAdicionar} className="mt-3">
        <Plus /> Adicionar etapa
      </Button>
    </section>
  )
}
