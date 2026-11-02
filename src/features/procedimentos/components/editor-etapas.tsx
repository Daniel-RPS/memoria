import { Plus } from 'lucide-react'
import { useFieldArray, useFormContext } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import type { ValoresProcedimento } from '@/lib/esquema-procedimento'
import { LinhaEtapa } from '@/features/procedimentos/components/linha-etapa'

function idDaEtapa(id: string) {
  return `etapa-${id}`
}

function novaEtapa() {
  return { id: crypto.randomUUID(), texto: '' }
}

/** Etapas numeradas pela posição: excluir uma renumera as seguintes. */
export function EditorEtapas() {
  const { control, register } = useFormContext<ValoresProcedimento>()
  // `keyName` próprio: o padrão (`id`) esconderia o id da etapa.
  const { fields, append, insert, remove } = useFieldArray({
    control,
    name: 'etapas',
    keyName: 'chave',
  })

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

  return (
    <section aria-labelledby="titulo-etapas">
      <h2 id="titulo-etapas" className="text-lg font-bold">
        Etapas
      </h2>

      {fields.length === 0 ? (
        <p className="mt-1 text-sm text-grafite">
          Nenhuma etapa ainda. Adicione a primeira e escreva o que fazer nela.
        </p>
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
              onCriarProxima={() => insert(indice + 1, novaEtapa())}
              onApagarVazia={() => handleApagarVazia(indice)}
              onExcluir={() => remove(indice)}
            />
          ))}
        </ol>
      )}

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleAdicionar}
        className="mt-1 -ml-2 text-grafite hover:text-tinta"
      >
        <Plus /> Adicionar etapa
      </Button>
    </section>
  )
}
