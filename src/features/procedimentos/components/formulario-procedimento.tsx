import { useEffect, useRef, type ReactNode } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, FormProvider, useForm } from 'react-hook-form'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCategorias } from '@/hooks/use-categorias'
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

/** Radix Select não aceita valor vazio; este representa "sem categoria". */
const SEM_CATEGORIA = 'sem-categoria'

/** Título, categoria e etapas. */
export function FormularioProcedimento({
  valoresIniciais,
  onEnviar,
  onAlterar,
  situacao,
  rodape,
}: FormularioProcedimentoProps) {
  const { categorias } = useCategorias()
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
                  <Select
                    value={field.value || SEM_CATEGORIA}
                    onValueChange={(valor) => field.onChange(valor === SEM_CATEGORIA ? '' : valor)}
                  >
                    <SelectTrigger id="categoria" className="w-full bg-papel">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={SEM_CATEGORIA}>Sem categoria</SelectItem>
                      {categorias.map((categoria) => (
                        <SelectItem key={categoria.id} value={categoria.id}>
                          <span
                            aria-hidden
                            className="size-2.5 rounded-full"
                            style={{ backgroundColor: categoria.cor }}
                          />
                          {categoria.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
