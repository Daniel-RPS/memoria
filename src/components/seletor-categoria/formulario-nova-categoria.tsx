import { useEffect, useId, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { cn } from 'cn'
import { PaletaCores } from '@/components/paleta-cores'
import { ChipsDeProcedimentos } from '@/components/seletor-categoria/chips-de-procedimentos'
import { Button } from '@/components/ui/button'
import { ErroDeValidacao } from '@/lib/erros'
import { esquemaNomeCategoria, TAMANHO_MAXIMO_NOME_CATEGORIA } from '@/lib/esquemas'

const esquemaNovaCategoria = z.object({
  nome: esquemaNomeCategoria,
  cor: z.string(),
})

type NovaCategoriaInput = z.infer<typeof esquemaNovaCategoria>

export interface DadosNovaCategoria {
  nome: string
  cor?: string
}

interface FormularioNovaCategoriaProps {
  /** Nome acessível do campo e placeholder, ex.: "Nova categoria". */
  rotulo: string
  /** Cor marcada ao abrir. */
  corInicial: string
  rotuloBotao: string
  onCriar: (dados: DadosNovaCategoria) => Promise<unknown>
  /**
   * Categoria de Grupo: mostra "Usar de Procedimentos" (chips) e cria a partir do escolhido.
   * Sem ele (Procedimentos), a seção não aparece.
   */
  onUsarDeProcedimentos?: (idCategoria: string) => Promise<unknown>
  /** Esc com o campo aberto; sem ele, Esc só limpa. */
  onCancelar?: () => void
  autoFocus?: boolean
  className?: string
}

/**
 * Nome e cor de uma categoria nova. Enter cria, Esc cancela. Nome vazio ou
 * repetido aparece como erro do campo. Funciona dentro de menus: as teclas não escapam para eles.
 */
export function FormularioNovaCategoria({
  rotulo,
  corInicial,
  rotuloBotao,
  onCriar,
  onUsarDeProcedimentos,
  onCancelar,
  autoFocus,
  className,
}: FormularioNovaCategoriaProps) {
  const idErro = useId()
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    setFocus,
    setValue,
    getFieldState,
    formState: { errors, isSubmitting },
  } = useForm<NovaCategoriaInput>({
    resolver: zodResolver(esquemaNovaCategoria),
    defaultValues: { nome: '', cor: corInicial },
  })
  const erro = errors.nome?.message
  const nomeDigitado = useWatch({ control, name: 'nome' })

  // Depois de criar, a próxima cor livre muda; só segue se o usuário não escolheu outra.
  useEffect(() => {
    if (!getFieldState('cor').isDirty) setValue('cor', corInicial)
  }, [corInicial, getFieldState, setValue])

  const [isUsando, setIsUsando] = useState(false)

  function mostrarErro(erroAoCriar: unknown) {
    setError('nome', {
      message:
        erroAoCriar instanceof ErroDeValidacao
          ? erroAoCriar.message
          : 'Não foi possível salvar. Tente de novo.',
    })
  }

  async function handleCriar({ nome, cor }: NovaCategoriaInput) {
    try {
      await onCriar({ nome, cor: cor || undefined })
      reset()
    } catch (erroAoCriar) {
      mostrarErro(erroAoCriar)
    }
  }

  async function handleUsar(idCategoria: string) {
    if (!onUsarDeProcedimentos) return
    setIsUsando(true)
    try {
      await onUsarDeProcedimentos(idCategoria)
      reset()
    } catch (erroAoCriar) {
      mostrarErro(erroAoCriar)
    } finally {
      setIsUsando(false)
    }
  }

  return (
    <form
      onSubmit={(evento) => {
        evento.stopPropagation()
        void handleSubmit(handleCriar)(evento)
      }}
      onKeyDown={(evento) => {
        if (evento.key === 'Escape') {
          evento.preventDefault()
          if (onCancelar) onCancelar()
          else reset()
        }
        // Dentro de um menu: sem isto, letras viram busca, setas fecham o submenu e Tab é barrado.
        evento.stopPropagation()
      }}
      noValidate
      className={cn('flex flex-col gap-3', className)}
    >
      <div>
        <input
          {...register('nome')}
          placeholder={rotulo}
          aria-label={rotulo}
          aria-invalid={erro ? true : undefined}
          aria-describedby={erro ? idErro : undefined}
          maxLength={TAMANHO_MAXIMO_NOME_CATEGORIA}
          autoComplete="off"
          autoFocus={autoFocus}
          className="h-9 w-full min-w-0 rounded-sm border border-pauta bg-papel px-2 text-[0.9375rem] placeholder:text-grafite focus:border-caneta focus:outline-none aria-invalid:border-destructive"
        />
        {erro && (
          <p id={idErro} className="pt-1 text-sm text-destructive">
            {erro}
          </p>
        )}
      </div>
      {onUsarDeProcedimentos && (
        <ChipsDeProcedimentos
          termo={nomeDigitado}
          isDesabilitado={isUsando || isSubmitting}
          onUsar={(idCategoria) => void handleUsar(idCategoria)}
        />
      )}
      <Controller
        control={control}
        name="cor"
        render={({ field }) => (
          <PaletaCores
            rotulo={`Cor de ${rotulo.toLowerCase()}`}
            selecionada={field.value || undefined}
            tamanho="pequeno"
            nomeAmostra={nomeDigitado.trim() || rotulo}
            onEscolher={(cor) => {
              field.onChange(cor)
              setFocus('nome')
            }}
          />
        )}
      />
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-grafite">
          {onCancelar ? 'Enter cria · Esc cancela' : 'Enter cria'}
        </span>
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {rotuloBotao}
        </Button>
      </div>
    </form>
  )
}
