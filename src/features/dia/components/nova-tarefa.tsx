import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus } from 'lucide-react'
import type { DataLocal } from '@/db/types'
import { esquemaNovaTarefa, TAMANHO_MAXIMO_TITULO, type NovaTarefaInput } from '@/lib/esquemas'
import { useAcoesTarefa } from '@/features/dia/hooks/use-acoes-tarefa'

interface NovaTarefaProps {
  data: DataLocal
}

/** Próxima linha em branco da folha. Enter cria a tarefa e o campo continua pronto para a seguinte. */
export function NovaTarefa({ data }: NovaTarefaProps) {
  const { criarTarefa } = useAcoesTarefa()
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<NovaTarefaInput>({
    resolver: zodResolver(esquemaNovaTarefa),
    defaultValues: { titulo: '' },
  })
  const erro = errors.titulo?.message

  async function handleCriar({ titulo }: NovaTarefaInput) {
    // Limpa antes de gravar: quem digita rápido não perde o que já começou a escrever.
    reset()
    try {
      await criarTarefa({ titulo, data })
    } catch {
      setValue('titulo', titulo)
      setError('titulo', { message: 'Não foi possível salvar a tarefa. Tente de novo.' })
    }
  }

  return (
    <form onSubmit={handleSubmit(handleCriar)} className="px-1">
      <label className="flex min-h-12 items-center gap-2 pr-2">
        <span className="flex w-5 shrink-0 justify-center" />
        <Plus className="size-5 shrink-0 text-grafite" aria-hidden />
        <input
          {...register('titulo')}
          placeholder="Nova tarefa"
          aria-label="Nova tarefa"
          aria-invalid={erro ? true : undefined}
          aria-describedby={erro ? 'erro-nova-tarefa' : undefined}
          maxLength={TAMANHO_MAXIMO_TITULO}
          autoComplete="off"
          onKeyDown={(evento) => {
            if (evento.key === 'Escape') {
              reset()
              clearErrors()
            }
          }}
          className="h-12 w-full min-w-0 bg-transparent pl-1 text-base placeholder:text-grafite focus:outline-none"
        />
      </label>
      {erro && (
        <p id="erro-nova-tarefa" className="pb-3 pl-14 text-sm text-destructive">
          {erro}
        </p>
      )}
    </form>
  )
}
