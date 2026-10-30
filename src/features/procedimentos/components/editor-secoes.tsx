import { useFieldArray, useFormContext } from 'react-hook-form'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { novaSecao, novoPasso, type ValoresProcedimento } from '@/lib/esquema-procedimento'
import { EditorPasso } from '@/features/procedimentos/components/editor-passo'

/** Seções do procedimento, cada uma com seus passos em ordem. */
export function EditorSecoes() {
  const {
    control,
    formState: { errors },
  } = useFormContext<ValoresProcedimento>()
  const { fields, append, remove, move } = useFieldArray({ control, name: 'secoes' })

  return (
    <section aria-labelledby="titulo-secoes">
      <h2 id="titulo-secoes" className="text-xl font-bold">
        Seções e passos
      </h2>
      <FieldError className="mt-2" errors={[errors.secoes?.root ?? errors.secoes]} />

      <ol className="mt-4 flex flex-col gap-6">
        {fields.map((secao, indice) => (
          <EditorSecao
            key={secao.id}
            indice={indice}
            total={fields.length}
            onMover={(destino) => move(indice, destino)}
            onRemover={() => remove(indice)}
          />
        ))}
      </ol>

      <Button type="button" variant="outline" className="mt-4" onClick={() => append(novaSecao())}>
        <Plus /> Adicionar seção
      </Button>
    </section>
  )
}

interface EditorSecaoProps {
  indice: number
  total: number
  onMover: (destino: number) => void
  onRemover: () => void
}

function EditorSecao({ indice, total, onMover, onRemover }: EditorSecaoProps) {
  const {
    control,
    register,
    formState: { errors },
  } = useFormContext<ValoresProcedimento>()
  const passos = useFieldArray({ control, name: `secoes.${indice}.passos` })
  const erroTitulo = errors.secoes?.[indice]?.titulo
  const erroPassos = errors.secoes?.[indice]?.passos
  const numero = indice + 1

  return (
    <li className="rounded-md border border-pauta bg-papel">
      <div className="flex items-end gap-2 border-b border-pauta p-3">
        <Field className="flex-1" data-invalid={erroTitulo ? true : undefined}>
          <FieldLabel htmlFor={`secao-${indice}-titulo`}>Seção {numero}</FieldLabel>
          <Input
            id={`secao-${indice}-titulo`}
            {...register(`secoes.${indice}.titulo`)}
            aria-invalid={erroTitulo ? true : undefined}
            placeholder="Ex.: Preparar"
            className="font-semibold"
          />
          <FieldError errors={[erroTitulo]} />
        </Field>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={indice === 0}
          onClick={() => onMover(indice - 1)}
          aria-label={`Subir seção ${numero}`}
        >
          <ArrowUp />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={indice === total - 1}
          onClick={() => onMover(indice + 1)}
          aria-label={`Descer seção ${numero}`}
        >
          <ArrowDown />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={total === 1}
          onClick={onRemover}
          aria-label={`Remover seção ${numero}`}
          className="text-grafite"
        >
          <Trash2 />
        </Button>
      </div>

      <ol className="flex flex-col">
        {passos.fields.map((passo, indicePasso) => (
          <EditorPasso
            key={passo.id}
            indiceSecao={indice}
            indice={indicePasso}
            total={passos.fields.length}
            onMover={(destino) => passos.move(indicePasso, destino)}
            onRemover={() => passos.remove(indicePasso)}
          />
        ))}
      </ol>
      <div className="p-3">
        <FieldError className="mb-2" errors={[erroPassos?.root ?? erroPassos]} />
        <Button type="button" variant="ghost" onClick={() => passos.append(novoPasso())}>
          <Plus /> Adicionar passo
        </Button>
      </div>
    </li>
  )
}
