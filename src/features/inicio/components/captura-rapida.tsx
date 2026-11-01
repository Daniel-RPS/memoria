import { useEffect, useId, useState } from 'react'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CornerDownLeft, Plus } from 'lucide-react'
import { useLocation } from 'react-router'
import { cn } from 'cn'
import { DialogoLink } from '@/components/anexos/dialogo-link'
import { CampoCategoria } from '@/components/seletor-categoria/campo-categoria'
import type { AnexoDaCaptura } from '@/db/repositories/captura-repository'
import type { DataLocal } from '@/db/types'
import { isPedidoDeFocarCaptura } from '@/app/use-atalho-captura'
import { nomeDoLink, type LinkInput } from '@/lib/anexos'
import { esquemaCaptura, type CapturaInput } from '@/lib/captura'
import { ErroDeValidacao } from '@/lib/erros'
import { AnexosEscolhidos, BotaoAnexar } from '@/features/inicio/components/anexos-da-captura'
import { EscolhaDoDia } from '@/features/inicio/components/escolha-do-dia'
import { EscolhaDoTipo } from '@/features/inicio/components/escolha-do-tipo'
import { ItensDaCaptura } from '@/features/inicio/components/itens-da-captura'
import { useCaptura } from '@/features/inicio/hooks/use-captura'

interface CapturaRapidaProps {
  hoje: DataLocal
}

function valoresIniciais(hoje: DataLocal): CapturaInput {
  return { titulo: '', tipo: 'tarefa', data: hoje, itens: [{ titulo: '' }] }
}

/**
 * Anotar sem sair do Início: título, tipo (tarefa ou grupo com itens), categoria, dia e,
 * na tarefa, anexos. Enter cria; o campo volta pronto para a próxima.
 */
export function CapturaRapida({ hoje }: CapturaRapidaProps) {
  const idErro = useId()
  const location = useLocation()
  const { capturar } = useCaptura()
  const [anexos, setAnexos] = useState<AnexoDaCaptura[]>([])
  const [isLinkAberto, setIsLinkAberto] = useState(false)
  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    setError,
    getValues,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<CapturaInput>({
    resolver: zodResolver(esquemaCaptura),
    defaultValues: valoresIniciais(hoje),
  })
  const camposDosItens = useFieldArray({ control, name: 'itens' })
  const [tipo, data, categoryId, subcategoryId] = useWatch({
    control,
    name: ['tipo', 'data', 'categoryId', 'subcategoryId'],
  })
  const erro = errors.titulo?.message

  // Ctrl+K / N de qualquer tela chega aqui com um pedido novo no estado da navegação.
  useEffect(() => {
    if (isPedidoDeFocarCaptura(location.state)) setFocus('titulo')
  }, [location.state, setFocus])

  async function handleCriar(dados: CapturaInput) {
    try {
      await capturar({ ...dados, anexos: dados.tipo === 'tarefa' ? anexos : [] })
    } catch (falha) {
      if (falha instanceof ErroDeValidacao) {
        setError('titulo', { message: falha.message })
        setFocus('titulo')
        return
      }
      throw falha
    }
    reset(valoresIniciais(hoje))
    setAnexos([])
    setFocus('titulo')
  }

  const criar = handleSubmit(handleCriar)

  function handleSalvarLink(link: LinkInput) {
    setAnexos((atuais) => [
      ...atuais,
      { tipo: 'link', url: link.url, nome: link.nome || nomeDoLink(link.url) },
    ])
    return Promise.resolve()
  }

  return (
    <section
      aria-label="Captura rápida"
      className="rounded-lg border border-pauta bg-papel px-6 pt-5 pb-4 shadow-[4px_4px_0_var(--marca-texto)]"
    >
      <form noValidate onSubmit={(evento) => void criar(evento)}>
        <div className="flex items-center gap-3">
          <Plus aria-hidden className="size-6 shrink-0 text-caneta" />
          <input
            {...register('titulo')}
            autoFocus
            autoComplete="off"
            aria-label="O que precisa ser feito?"
            aria-invalid={erro ? true : undefined}
            aria-describedby={erro ? idErro : undefined}
            aria-keyshortcuts="Control+K N"
            placeholder={tipo === 'grupo' ? 'Nome do grupo' : 'O que precisa ser feito?'}
            className="min-w-0 flex-1 bg-transparent text-2xl font-semibold tracking-[-0.01em] caret-caneta outline-none placeholder:font-normal placeholder:text-grafite/70"
          />
          <kbd className="hidden rounded border border-pauta px-1.5 py-0.5 font-sans text-xs text-grafite sm:block">
            Ctrl K
          </kbd>
        </div>
        {erro && (
          <p id={idErro} role="alert" className="mt-1 ml-9 text-sm text-destructive">
            {erro}
          </p>
        )}

        {tipo === 'grupo' && (
          <ItensDaCaptura
            campos={camposDosItens}
            register={register}
            valorDe={(indice) => getValues(`itens.${indice}.titulo`) ?? ''}
            onCriar={() => void criar()}
          />
        )}
        {tipo === 'tarefa' && (
          <AnexosEscolhidos
            anexos={anexos}
            onRemover={(indice) =>
              setAnexos((atuais) => atuais.filter((_, posicao) => posicao !== indice))
            }
          />
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-dashed border-pauta pt-4">
          <EscolhaDoTipo tipo={tipo} onEscolher={(novo) => setValue('tipo', novo)} />
          <CampoCategoria
            atual={{ categoryId, subcategoryId }}
            onEscolher={(categoria) => {
              setValue('categoryId', categoria.categoryId)
              setValue('subcategoryId', categoria.subcategoryId)
            }}
            className="w-auto max-w-56 gap-2"
          />
          <span aria-hidden className="mx-1 hidden h-5 w-px bg-pauta sm:block" />
          <EscolhaDoDia
            hoje={hoje}
            data={data}
            onEscolher={(novaData) => setValue('data', novaData)}
          />
          <div className="ml-auto flex items-center gap-1">
            {tipo === 'tarefa' && (
              <BotaoAnexar
                onAdicionar={(novos) => setAnexos((atuais) => [...atuais, ...novos])}
                onPedirLink={() => setIsLinkAberto(true)}
              />
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className={cn(
                'flex h-8 items-center gap-1.5 rounded-md bg-tinta px-3 text-sm font-semibold text-papel outline-none hover:bg-violeta-profundo focus-visible:ring-3 focus-visible:ring-ring/50',
                isSubmitting && 'opacity-60',
              )}
            >
              Criar <CornerDownLeft aria-hidden className="size-3.5" />
            </button>
          </div>
        </div>
      </form>
      {/* Fora do formulário: o envio do diálogo não pode criar a tarefa. */}
      <DialogoLink
        isAberto={isLinkAberto}
        onMudarAberto={setIsLinkAberto}
        onSalvar={handleSalvarLink}
      />
    </section>
  )
}
