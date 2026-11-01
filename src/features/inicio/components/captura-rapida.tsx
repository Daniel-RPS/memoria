import { useEffect, useId, useState, type KeyboardEvent } from 'react'
import { useForm, useWatch } from 'react-hook-form'
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
import { dividirTexto, esquemaCaptura, type CapturaInput } from '@/lib/captura'
import { ErroDeValidacao } from '@/lib/erros'
import { AnexosEscolhidos, BotaoAnexar } from '@/features/inicio/components/anexos-da-captura'
import { EscolhaDoDia } from '@/features/inicio/components/escolha-do-dia'
import { EscolhaDoTipo } from '@/features/inicio/components/escolha-do-tipo'
import { SeletorDeGrupo } from '@/features/inicio/components/seletor-de-grupo'
import { useCaptura } from '@/features/inicio/hooks/use-captura'
import { useSeriesParaEscolher } from '@/features/inicio/hooks/use-series-para-escolher'

interface CapturaRapidaProps {
  hoje: DataLocal
}

function valoresIniciais(hoje: DataLocal): CapturaInput {
  return { texto: '', tipo: 'tarefa', data: hoje }
}

/** A 2ª linha do placeholder ensina o que as linhas seguintes viram (`dividirTexto`). */
const PLACEHOLDER: Record<CapturaInput['tipo'], string> = {
  tarefa: 'O que precisa ser feito?\nDetalhes nas linhas de baixo viram anotação',
  grupo: 'Nome do grupo\nUm item por linha',
  'em-grupo': 'Item para o grupo\nUm item por linha',
}

/**
 * Anotar sem sair do Início: texto, tipo (tarefa, grupo novo com itens ou item num grupo
 * que já existe), categoria, dia e, na tarefa, anexos. Enter cria e Shift+Enter quebra a
 * linha: a 1ª linha é o título e as outras viram a anotação da tarefa ou itens do grupo.
 */
export function CapturaRapida({ hoje }: CapturaRapidaProps) {
  const idErro = useId()
  const location = useLocation()
  const { capturar } = useCaptura()
  const [anexos, setAnexos] = useState<AnexoDaCaptura[]>([])
  const [isLinkAberto, setIsLinkAberto] = useState(false)
  const [isSeletorDeGrupoAberto, setIsSeletorDeGrupoAberto] = useState(false)
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
  const [tipo, data, categoryId, subcategoryId, seriesId] = useWatch({
    control,
    name: ['tipo', 'data', 'categoryId', 'subcategoryId', 'seriesId'],
  })
  const series = useSeriesParaEscolher(data)
  const erro = errors.texto?.message ?? errors.seriesId?.message

  // Ctrl+K / N de qualquer tela chega aqui com um pedido novo no estado da navegação.
  useEffect(() => {
    if (isPedidoDeFocarCaptura(location.state)) setFocus('texto')
  }, [location.state, setFocus])

  async function handleCriar(dados: CapturaInput) {
    try {
      const grupo = series.find((opcao) => opcao.serie.id === dados.seriesId)
      const { titulo, itens, anotacao } = dividirTexto(dados.tipo, dados.texto)
      const isTarefa = dados.tipo === 'tarefa'
      await capturar(
        {
          tipo: dados.tipo,
          data: dados.data,
          categoryId: dados.categoryId,
          subcategoryId: dados.subcategoryId,
          seriesId: dados.seriesId,
          titulo,
          itens: itens.map((item) => ({ titulo: item })),
          anotacao: isTarefa ? anotacao : undefined,
          anexos: isTarefa ? anexos : [],
        },
        grupo?.serie.titulo,
      )
    } catch (falha) {
      if (falha instanceof ErroDeValidacao) {
        setError('texto', { message: falha.message })
        setFocus('texto')
        return
      }
      throw falha
    }
    reset(valoresIniciais(hoje))
    setAnexos([])
    setFocus('texto')
  }

  const criar = handleSubmit(handleCriar, (falhas) => {
    // Só falta o grupo: abre a lista para escolher.
    if (falhas.seriesId && !falhas.texto) setIsSeletorDeGrupoAberto(true)
  })

  /** Enter cria; Shift+Enter quebra a linha (fora durante a composição de acentos). */
  function handleKeyDown(evento: KeyboardEvent<HTMLTextAreaElement>) {
    if (evento.key !== 'Enter' || evento.shiftKey || evento.nativeEvent.isComposing) return
    evento.preventDefault()
    void criar()
  }

  function handleEscolherTipo(novo: CapturaInput['tipo']) {
    setValue('tipo', novo)
    if (novo === 'em-grupo' && !getValues('seriesId')) setIsSeletorDeGrupoAberto(true)
  }

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
      className="rounded-lg border border-pauta bg-papel px-5 pt-6 pb-4 shadow-[4px_4px_0_var(--marca-texto)]"
    >
      <form noValidate onSubmit={(evento) => void criar(evento)}>
        <div className="flex items-start gap-3">
          <Plus aria-hidden className="mt-1 size-6 shrink-0 text-caneta" />
          <textarea
            {...register('texto')}
            onKeyDown={handleKeyDown}
            rows={3}
            autoFocus
            autoComplete="off"
            aria-label="O que precisa ser feito?"
            aria-invalid={erro ? true : undefined}
            aria-describedby={erro ? idErro : undefined}
            aria-keyshortcuts="Control+K N"
            placeholder={PLACEHOLDER[tipo]}
            className="field-sizing-content max-h-80 min-h-[3lh] min-w-0 flex-1 resize-none bg-transparent text-xl leading-8 font-medium tracking-[-0.01em] caret-caneta outline-none placeholder:font-normal placeholder:text-grafite/70"
          />
          <kbd className="mt-1.5 hidden rounded border border-pauta px-1.5 py-0.5 font-sans text-xs text-grafite sm:block">
            Ctrl K
          </kbd>
        </div>
        {erro && (
          <p id={idErro} role="alert" className="mt-1 ml-9 text-sm text-destructive">
            {erro}
          </p>
        )}
        {!erro && tipo === 'em-grupo' && (
          <p className="mt-1 ml-9 text-xs text-grafite">O item usa a categoria do grupo.</p>
        )}

        {tipo === 'tarefa' && (
          <AnexosEscolhidos
            anexos={anexos}
            onRemover={(indice) =>
              setAnexos((atuais) => atuais.filter((_, posicao) => posicao !== indice))
            }
          />
        )}

        <div className="mt-4 flex flex-wrap items-center gap-x-1.5 gap-y-2 border-t border-dashed border-pauta pt-4">
          <EscolhaDoTipo tipo={tipo} onEscolher={handleEscolherTipo} />
          {tipo === 'em-grupo' ? (
            <SeletorDeGrupo
              series={series}
              seriesId={seriesId}
              data={data}
              isAberto={isSeletorDeGrupoAberto}
              onMudarAberto={setIsSeletorDeGrupoAberto}
              onEscolher={(id) => {
                setValue('seriesId', id, { shouldValidate: Boolean(errors.seriesId) })
                setFocus('texto')
              }}
              isInvalido={Boolean(errors.seriesId)}
            />
          ) : (
            <CampoCategoria
              atual={{ categoryId, subcategoryId }}
              onEscolher={(categoria) => {
                setValue('categoryId', categoria.categoryId)
                setValue('subcategoryId', categoria.subcategoryId)
              }}
              className="w-auto max-w-40 gap-2"
            />
          )}
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
