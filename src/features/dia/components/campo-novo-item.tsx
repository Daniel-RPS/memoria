import { useId } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus } from 'lucide-react'
import { cn } from 'cn'
import { esquemaNovoItem, TAMANHO_MAXIMO_TITULO, type NovoItemInput } from '@/lib/esquemas'

interface CampoNovoItemProps {
  /** Texto do placeholder e nome acessível, ex.: "Nova tarefa". */
  rotulo: string
  onCriar: (titulo: string) => Promise<unknown>
  /** `compacto` é usado nas subtarefas. */
  tamanho?: 'normal' | 'compacto'
  autoFocus?: boolean
  /** Chamado quando o campo perde o foco vazio (ex.: fechar um painel que só tem o campo). */
  onSairVazio?: () => void
}

/** Linha em branco que cria um item com Enter e continua pronta para o próximo. Esc limpa. */
export function CampoNovoItem({
  rotulo,
  onCriar,
  tamanho = 'normal',
  autoFocus,
  onSairVazio,
}: CampoNovoItemProps) {
  const idErro = useId()
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<NovoItemInput>({
    resolver: zodResolver(esquemaNovoItem),
    defaultValues: { titulo: '' },
  })
  const erro = errors.titulo?.message
  const isCompacto = tamanho === 'compacto'

  async function handleCriar({ titulo }: NovoItemInput) {
    // Limpa antes de gravar: quem digita rápido não perde o que já começou a escrever.
    reset()
    try {
      await onCriar(titulo)
    } catch {
      setValue('titulo', titulo)
      setError('titulo', { message: 'Não foi possível salvar. Tente de novo.' })
    }
  }

  return (
    <form onSubmit={handleSubmit(handleCriar)}>
      <label className={cn('flex items-center gap-2 pr-2', isCompacto ? 'min-h-9' : 'min-h-12')}>
        <Plus
          className={cn('shrink-0 text-grafite', isCompacto ? 'size-4' : 'size-5')}
          aria-hidden
        />
        <input
          {...register('titulo', {
            onBlur: (evento) => {
              if (onSairVazio && !evento.target.value.trim()) onSairVazio()
            },
          })}
          placeholder={rotulo}
          aria-label={rotulo}
          aria-invalid={erro ? true : undefined}
          aria-describedby={erro ? idErro : undefined}
          maxLength={TAMANHO_MAXIMO_TITULO}
          autoComplete="off"
          autoFocus={autoFocus}
          onKeyDown={(evento) => {
            if (evento.key === 'Escape') {
              reset()
              clearErrors()
            }
          }}
          className={cn(
            'w-full min-w-0 bg-transparent pl-1 placeholder:text-grafite focus:outline-none',
            isCompacto ? 'h-9 text-[0.9375rem]' : 'h-12 text-base',
          )}
        />
      </label>
      {erro && (
        <p id={idErro} className="pb-2 pl-7 text-sm text-destructive">
          {erro}
        </p>
      )}
    </form>
  )
}
