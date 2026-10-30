import { Controller, useFieldArray, useFormContext, useWatch } from 'react-hook-form'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { TipoCampoVariavel } from '@/db/types'
import type { ValoresProcedimento } from '@/lib/esquema-procedimento'

const NOMES_DOS_TIPOS: Record<TipoCampoVariavel, string> = {
  texto: 'Texto',
  numero: 'Número',
  data: 'Data',
  credencial: 'Credencial (onde está a senha)',
}

/** Campos que o usuário preenche a cada execução e que aparecem nos passos como {{nome}}. */
export function EditorCampos() {
  const {
    control,
    register,
    formState: { errors },
  } = useFormContext<ValoresProcedimento>()
  const { fields, append, remove } = useFieldArray({ control, name: 'camposVariaveis' })
  const tipos = useWatch({ control, name: 'camposVariaveis' })

  return (
    <section aria-labelledby="titulo-campos">
      <h2 id="titulo-campos" className="text-xl font-bold">
        Campos variáveis
      </h2>
      <p className="mt-1 max-w-prose text-[0.9375rem] text-grafite">
        Valores que mudam a cada execução, como o nome de um servidor. Escreva{' '}
        <code className="font-mono">{'{{nome do campo}}'}</code> num passo para usar o valor. Para
        senhas, use o tipo credencial: o MemorIA guarda só onde a senha está, nunca a senha.
      </p>

      {fields.length > 0 && (
        <ul className="mt-4 flex flex-col gap-3">
          {fields.map((campo, indice) => {
            const erroNome = errors.camposVariaveis?.[indice]?.nome
            const isCredencial = tipos[indice]?.tipo === 'credencial'
            return (
              <li
                key={campo.id}
                className="grid gap-3 rounded-md border border-pauta bg-papel p-3 sm:grid-cols-[1fr_14rem_auto]"
              >
                <Field data-invalid={erroNome ? true : undefined}>
                  <FieldLabel htmlFor={`campo-${indice}-nome`}>Nome do campo</FieldLabel>
                  <Input
                    id={`campo-${indice}-nome`}
                    {...register(`camposVariaveis.${indice}.nome`)}
                    aria-invalid={erroNome ? true : undefined}
                    placeholder="Ex.: Servidor"
                  />
                  <FieldError errors={[erroNome]} />
                </Field>
                <Field>
                  <FieldLabel htmlFor={`campo-${indice}-tipo`}>Tipo</FieldLabel>
                  <Controller
                    control={control}
                    name={`camposVariaveis.${indice}.tipo`}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger id={`campo-${indice}-tipo`} className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(NOMES_DOS_TIPOS).map(([valor, nome]) => (
                            <SelectItem key={valor} value={valor}>
                              {nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </Field>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(indice)}
                  aria-label={`Remover campo ${tipos[indice]?.nome || indice + 1}`}
                  className="self-end text-grafite"
                >
                  <X />
                </Button>
                {isCredencial && (
                  <Field className="sm:col-span-3">
                    <FieldLabel htmlFor={`campo-${indice}-local`}>Onde está a senha</FieldLabel>
                    <Input
                      id={`campo-${indice}-local`}
                      {...register(`camposVariaveis.${indice}.localCredencial`)}
                      placeholder="Ex.: Cofre Bitwarden, item Servidor de e-mail"
                    />
                    <FieldDescription>
                      Só o local. Não existe lugar para digitar a senha.
                    </FieldDescription>
                  </Field>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <Button
        type="button"
        variant="outline"
        className="mt-3"
        onClick={() =>
          append({ id: crypto.randomUUID(), nome: '', tipo: 'texto', localCredencial: '' })
        }
      >
        <Plus /> Adicionar campo
      </Button>
    </section>
  )
}
