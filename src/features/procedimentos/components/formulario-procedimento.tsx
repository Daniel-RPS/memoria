import { FormProvider, useForm, useWatch, type SubmitErrorHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller } from 'react-hook-form'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useCategorias } from '@/hooks/use-categorias'
import { esquemaProcedimento, type ValoresProcedimento } from '@/lib/esquema-procedimento'
import { camposDesconhecidos } from '@/lib/procedimentos'
import { EditorCampos } from '@/features/procedimentos/components/editor-campos'
import { EditorSecoes } from '@/features/procedimentos/components/editor-secoes'

interface FormularioProcedimentoProps {
  valoresIniciais: ValoresProcedimento
  rotuloSalvar: string
  /** Para onde "Cancelar" volta. */
  voltarPara: string
  onSalvar: (valores: ValoresProcedimento) => Promise<unknown>
}

/** Radix Select não aceita valor vazio; este representa "sem categoria". */
const SEM_CATEGORIA = 'sem-categoria'

/** Editor completo: dados gerais, campos variáveis e seções com passos. */
export function FormularioProcedimento({
  valoresIniciais,
  rotuloSalvar,
  voltarPara,
  onSalvar,
}: FormularioProcedimentoProps) {
  const { categorias } = useCategorias()
  const formulario = useForm<ValoresProcedimento>({
    resolver: zodResolver(esquemaProcedimento),
    defaultValues: valoresIniciais,
  })
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = formulario
  const [secoes, campos] = useWatch({ control, name: ['secoes', 'camposVariaveis'] })
  const desconhecidos = camposDesconhecidos({
    secoes: secoes.map((secao) => ({
      ...secao,
      passos: secao.passos.map((passo) => ({ ...passo, anexos: [] })),
    })),
    camposVariaveis: campos.map((campo) => ({ ...campo, localCredencial: undefined })),
  })

  // Leva o foco ao primeiro campo com erro, para quem salva com algo faltando.
  const handleInvalido: SubmitErrorHandler<ValoresProcedimento> = () => {
    window.requestAnimationFrame(() => {
      document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
    })
  }

  return (
    <FormProvider {...formulario}>
      <form
        onSubmit={handleSubmit(onSalvar, handleInvalido)}
        noValidate
        className="mt-8 flex flex-col gap-10"
      >
        <FieldGroup className="rounded-md border border-pauta bg-papel p-4 sm:p-6">
          <Field data-invalid={errors.titulo ? true : undefined}>
            <FieldLabel htmlFor="titulo">Título</FieldLabel>
            <Input
              id="titulo"
              {...register('titulo')}
              aria-invalid={errors.titulo ? true : undefined}
              placeholder="Ex.: Renovar certificado do servidor de e-mail"
            />
            <FieldError errors={[errors.titulo]} />
          </Field>
          <Field>
            <FieldLabel htmlFor="categoria">Categoria</FieldLabel>
            <Controller
              control={control}
              name="categoryId"
              render={({ field }) => (
                <Select
                  value={field.value || SEM_CATEGORIA}
                  onValueChange={(valor) => field.onChange(valor === SEM_CATEGORIA ? '' : valor)}
                >
                  <SelectTrigger id="categoria" className="w-full sm:w-72">
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
          <Field>
            <FieldLabel htmlFor="descricao">Descrição</FieldLabel>
            <Textarea
              id="descricao"
              {...register('descricao')}
              rows={3}
              placeholder="Para que serve e quando usar"
            />
          </Field>
        </FieldGroup>

        <EditorCampos />
        <EditorSecoes />

        {desconhecidos.length > 0 && (
          <p
            role="status"
            className="rounded-md border-l-4 border-l-marca-texto bg-papel px-4 py-3"
          >
            Os passos usam{' '}
            {desconhecidos.map((nome, indice) => (
              <span key={nome}>
                {indice > 0 && ', '}
                <code className="font-mono">{`{{${nome}}}`}</code>
              </span>
            ))}
            , que não {desconhecidos.length === 1 ? 'é um campo' : 'são campos'}. Crie o campo em
            Campos variáveis ou corrija o nome.
          </p>
        )}

        <div className="sticky bottom-4 flex justify-end gap-2 rounded-md border border-pauta bg-papel/95 p-3 shadow-sm backdrop-blur">
          <Button asChild variant="ghost">
            <Link to={voltarPara}>Cancelar</Link>
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {rotuloSalvar}
          </Button>
        </div>
      </form>
    </FormProvider>
  )
}
