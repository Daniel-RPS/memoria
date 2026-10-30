import { useState } from 'react'
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form'
import { ArrowDown, ArrowUp, Plus, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { ValoresProcedimento } from '@/lib/esquema-procedimento'

interface EditorPassoProps {
  indiceSecao: number
  indice: number
  total: number
  onMover: (destino: number) => void
  onRemover: () => void
}

/** Um passo: texto, e opcionalmente código, alerta e subpassos. */
export function EditorPasso({ indiceSecao, indice, total, onMover, onRemover }: EditorPassoProps) {
  const {
    control,
    register,
    formState: { errors },
  } = useFormContext<ValoresProcedimento>()
  const caminho = `secoes.${indiceSecao}.passos.${indice}` as const
  const subpassos = useFieldArray({ control, name: `${caminho}.subpassos` })
  const [codigo, alerta] = useWatch({ control, name: [`${caminho}.codigo`, `${caminho}.alerta`] })
  // Código e alerta começam escondidos; aparecem se já têm conteúdo ou se o usuário pedir.
  const [isComCodigo, setIsComCodigo] = useState(Boolean(codigo))
  const [isComAlerta, setIsComAlerta] = useState(Boolean(alerta))
  const erros = errors.secoes?.[indiceSecao]?.passos?.[indice]
  const numero = indice + 1
  const prefixoId = `passo-${indiceSecao}-${indice}`

  return (
    <li className="flex flex-col gap-3 border-b border-pauta p-3 last:border-b-0">
      <div className="flex items-start gap-2">
        <Field className="flex-1" data-invalid={erros?.texto ? true : undefined}>
          <FieldLabel htmlFor={`${prefixoId}-texto`}>Passo {numero}</FieldLabel>
          <Textarea
            id={`${prefixoId}-texto`}
            {...register(`${caminho}.texto`)}
            aria-invalid={erros?.texto ? true : undefined}
            rows={2}
            placeholder="O que fazer. Use {{campo}} para valores que mudam."
          />
          <FieldError errors={[erros?.texto]} />
        </Field>
        <div className="flex flex-col pt-6">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={indice === 0}
            onClick={() => onMover(indice - 1)}
            aria-label={`Subir passo ${numero}`}
          >
            <ArrowUp />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={indice === total - 1}
            onClick={() => onMover(indice + 1)}
            aria-label={`Descer passo ${numero}`}
          >
            <ArrowDown />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onRemover}
            aria-label={`Remover passo ${numero}`}
            className="text-grafite"
          >
            <Trash2 />
          </Button>
        </div>
      </div>

      {isComCodigo && (
        <Field>
          <FieldLabel htmlFor={`${prefixoId}-codigo`}>Código ou comando</FieldLabel>
          <Textarea
            id={`${prefixoId}-codigo`}
            {...register(`${caminho}.codigo`)}
            rows={3}
            spellCheck={false}
            className="font-mono text-sm"
          />
        </Field>
      )}
      {isComAlerta && (
        <Field>
          <FieldLabel htmlFor={`${prefixoId}-alerta`}>Alerta</FieldLabel>
          <Input
            id={`${prefixoId}-alerta`}
            {...register(`${caminho}.alerta`)}
            placeholder="Ex.: Não reinicie em horário comercial"
          />
        </Field>
      )}

      {subpassos.fields.length > 0 && (
        <ul aria-label={`Subpassos do passo ${numero}`} className="flex flex-col gap-2 pl-4">
          {subpassos.fields.map((subpasso, indiceSubpasso) => {
            const erro = erros?.subpassos?.[indiceSubpasso]?.texto
            return (
              <li key={subpasso.id} className="flex items-start gap-2">
                <Field className="flex-1" data-invalid={erro ? true : undefined}>
                  <Input
                    {...register(`${caminho}.subpassos.${indiceSubpasso}.texto`)}
                    aria-label={`Subpasso ${indiceSubpasso + 1} do passo ${numero}`}
                    aria-invalid={erro ? true : undefined}
                  />
                  <FieldError errors={[erro]} />
                </Field>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => subpassos.remove(indiceSubpasso)}
                  aria-label={`Remover subpasso ${indiceSubpasso + 1}`}
                  className="mt-0.5 text-grafite"
                >
                  <X />
                </Button>
              </li>
            )
          })}
        </ul>
      )}

      <div className="flex flex-wrap gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-grafite"
          onClick={() => subpassos.append({ id: crypto.randomUUID(), texto: '' })}
        >
          <Plus /> Subpasso
        </Button>
        {!isComCodigo && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-grafite"
            onClick={() => setIsComCodigo(true)}
          >
            <Plus /> Código
          </Button>
        )}
        {!isComAlerta && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-grafite"
            onClick={() => setIsComAlerta(true)}
          >
            <Plus /> Alerta
          </Button>
        )}
      </div>
    </li>
  )
}
