import { useEffect, useRef, type ReactNode } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, FormProvider, useForm } from 'react-hook-form'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { CampoCategoria } from '@/components/seletor-categoria/campo-categoria'
import { SeletorIcone } from '@/components/icones/seletor-icone'
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

/** Ícone, título, categoria e etapas. */
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
    handleSubmit,
    formState: { errors },
  } = formulario

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
        className="mt-2 flex flex-col gap-6"
      >
        <div className="flex flex-col gap-2">
          <div className="flex items-start gap-1">
            <Controller
              control={control}
              name="icone"
              render={({ field }) => (
                <SeletorIcone
                  icone={field.value}
                  onEscolher={field.onChange}
                  rotulo="Ícone do procedimento"
                  tamanho="lg"
                  className="mt-0.5 -ml-1"
                />
              )}
            />
            <Field className="min-w-0 flex-1" data-invalid={errors.titulo ? true : undefined}>
              <FieldLabel htmlFor="titulo" className="sr-only">
                Título
              </FieldLabel>
              <Input
                id="titulo"
                {...register('titulo')}
                aria-invalid={errors.titulo ? true : undefined}
                placeholder="Título do procedimento"
                autoComplete="off"
                className="-mx-1 h-auto rounded-sm border-transparent bg-transparent px-1 py-0.5 text-3xl font-extrabold tracking-[-0.02em] shadow-none [font-stretch:80%] placeholder:text-grafite/55 hover:bg-accent/40 focus-visible:border-caneta/50 focus-visible:bg-card focus-visible:ring-0 md:text-3xl dark:bg-transparent dark:focus-visible:bg-card"
              />
              <FieldError errors={[errors.titulo]} />
            </Field>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <FieldLabel htmlFor="categoria" className="text-sm text-grafite">
              Categoria
            </FieldLabel>
            <div className="w-full max-w-64 min-w-0 flex-1 sm:flex-none">
              <Controller
                control={control}
                name="categoryId"
                render={({ field }) => (
                  <CampoCategoria
                    tipo="procedimento"
                    id="categoria"
                    atual={{ categoryId: field.value || undefined }}
                    onEscolher={(categoria) => field.onChange(categoria.categoryId ?? '')}
                  />
                )}
              />
            </div>
            {situacao && <div className="ml-auto">{situacao}</div>}
          </div>
        </div>

        <EditorEtapas />

        {rodape}
      </form>
    </FormProvider>
  )
}
