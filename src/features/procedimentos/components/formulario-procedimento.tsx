import { useEffect, useRef, type ReactNode } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { CampoCategoria } from '@/components/seletor-categoria/campo-categoria'
import {
  esquemaProcedimento,
  type DadosProcedimento,
  type ValoresProcedimento,
} from '@/lib/esquema-procedimento'
import { EditorEtapas } from '@/features/procedimentos/components/editor-etapas'

interface FormularioProcedimentoProps {
  valoresIniciais: ValoresProcedimento
  /** Ao enviar (botão de criar, no rodapé). */
  onEnviar?: (dados: DadosProcedimento) => Promise<unknown>
  /** A cada mudança válida (edição com gravação automática). */
  onAlterar?: (dados: DadosProcedimento) => void
  /** Ao lado da categoria, ex.: "Salvo". */
  situacao?: ReactNode
  /** Botões do fim do formulário. */
  rodape?: ReactNode
}

/** Título, categoria e etapas. */
export function FormularioProcedimento({
  valoresIniciais,
  onEnviar,
  onAlterar,
  situacao,
  rodape,
}: FormularioProcedimentoProps) {
  const formulario = useForm<ValoresProcedimento, unknown, DadosProcedimento>({
    resolver: zodResolver(esquemaProcedimento),
    defaultValues: valoresIniciais,
    mode: 'onChange',
  })
  const {
    register,
    control,
    subscribe,
    setValue,
    handleSubmit,
    formState: { errors },
  } = formulario
  const subcategoryId = useWatch({ control, name: 'subcategoryId' })

  const onAlterarRef = useRef(onAlterar)
  useEffect(() => {
    onAlterarRef.current = onAlterar
  })

  // Só o que o usuário muda (não a carga inicial) dispara a gravação.
  useEffect(
    () =>
      subscribe({
        formState: { values: true },
        callback: ({ values }) => {
          const resultado = esquemaProcedimento.safeParse(values)
          if (resultado.success) onAlterarRef.current?.(resultado.data)
        },
      }),
    [subscribe],
  )

  return (
    <FormProvider {...formulario}>
      <form
        onSubmit={handleSubmit(async (dados) => {
          await onEnviar?.(dados)
        })}
        noValidate
        className="mt-2 flex flex-col gap-10"
      >
        <div className="flex flex-col gap-4">
          <Field data-invalid={errors.titulo ? true : undefined}>
            <FieldLabel htmlFor="titulo" className="sr-only">
              Título
            </FieldLabel>
            <Input
              id="titulo"
              {...register('titulo')}
              aria-invalid={errors.titulo ? true : undefined}
              placeholder="Título do procedimento"
              autoComplete="off"
              className="h-auto border-transparent bg-transparent px-1 py-1 text-4xl font-extrabold tracking-[-0.02em] shadow-none [font-stretch:80%] hover:border-pauta md:text-4xl"
            />
            <FieldError errors={[errors.titulo]} />
          </Field>

          <div className="flex flex-wrap items-end justify-between gap-3">
            <Field className="w-full sm:w-72">
              <FieldLabel htmlFor="categoria">Categoria</FieldLabel>
              <Controller
                control={control}
                name="categoryId"
                render={({ field }) => (
                  <CampoCategoria
                    id="categoria"
                    atual={{
                      categoryId: field.value || undefined,
                      subcategoryId: subcategoryId || undefined,
                    }}
                    onEscolher={(categoria) => {
                      setValue('subcategoryId', categoria.subcategoryId ?? '', {
                        shouldDirty: true,
                      })
                      field.onChange(categoria.categoryId ?? '')
                    }}
                  />
                )}
              />
            </Field>
            {situacao}
          </div>
        </div>

        <EditorEtapas />

        {rodape}
      </form>
    </FormProvider>
  )
}
