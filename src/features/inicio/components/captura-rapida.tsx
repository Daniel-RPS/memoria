import { useEffect, useEffectEvent, useId, useRef, useState, type KeyboardEvent } from 'react'
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
import {
  DICA_DO_CAMPO,
  dividirTexto,
  esquemaCaptura,
  primeiraLinha,
  semLinhasVaziasNoTopo,
  trocarPrimeiraLinha,
  type CapturaInput,
  type TipoCaptura,
} from '@/lib/captura'
import { ErroDeValidacao } from '@/lib/erros'
import { AnexosEscolhidos, BotaoAnexar } from '@/features/inicio/components/anexos-da-captura'
import { EscolhaDoDia } from '@/features/inicio/components/escolha-do-dia'
import { EscolhaDoTipo } from '@/features/inicio/components/escolha-do-tipo'
import {
  ItensDaCaptura,
  type ItensDaCapturaHandle,
} from '@/features/inicio/components/itens-da-captura'
import { SeletorDeGrupo } from '@/features/inicio/components/seletor-de-grupo'
import { useCaptura } from '@/features/inicio/hooks/use-captura'
import { useSeriesParaEscolher } from '@/features/inicio/hooks/use-series-para-escolher'

interface CapturaRapidaProps {
  hoje: DataLocal
}

function valoresIniciais(hoje: DataLocal): CapturaInput {
  return { texto: '', itens: [''], tipo: 'tarefa', data: hoje }
}

/**
 * Anotar sem sair do Início: texto, tipo (tarefa, grupo novo com itens ou item num grupo
 * que já existe), categoria, dia e, na tarefa, anexos. Tarefa: Enter cria e Shift+Enter quebra
 * a linha (as linhas de baixo viram a anotação). Grupo: nome em destaque e uma linha por item
 * (`ItensDaCaptura`); "Em grupo…" usa a mesma lista, sem o nome. Um texto apagado por modo
 * (`DICA_DO_CAMPO`). Trocar de modo não perde o texto nem os itens.
 */
export function CapturaRapida({ hoje }: CapturaRapidaProps) {
  const idErro = useId()
  const location = useLocation()
  const { capturar } = useCaptura()
  const [anexos, setAnexos] = useState<AnexoDaCaptura[]>([])
  const [isLinkAberto, setIsLinkAberto] = useState(false)
  const [isSeletorDeGrupoAberto, setIsSeletorDeGrupoAberto] = useState(false)
  const itensRef = useRef<ItensDaCapturaHandle>(null)
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
  const [tipo, data, categoryId, subcategoryId, seriesId, texto, itens] = useWatch({
    control,
    name: ['tipo', 'data', 'categoryId', 'subcategoryId', 'seriesId', 'texto', 'itens'],
  })
  const series = useSeriesParaEscolher(data)
  const erro = errors.texto?.message ?? errors.itens?.message ?? errors.seriesId?.message

  /** Tarefa: o campo de texto; Grupo: o nome; Em grupo…: o último item. */
  function focarCampoPrincipal() {
    if (getValues('tipo') === 'tarefa') setFocus('texto')
    else itensRef.current?.focar()
  }

  const focarAoChegar = useEffectEvent(() => {
    if (!isSeletorDeGrupoAberto) focarCampoPrincipal()
  })

  // Ctrl+K / N de qualquer tela chega aqui com um pedido novo no estado da navegação.
  useEffect(() => {
    if (isPedidoDeFocarCaptura(location.state)) focarAoChegar()
  }, [location.state])

  // Trocou de modo (ou voltou para Tarefa depois de criar): o foco vai para o campo do modo,
  // menos quando a lista de grupos de "Em grupo…" abriu por cima.
  useEffect(() => focarAoChegar(), [tipo])

  async function handleCriar(dados: CapturaInput) {
    try {
      const categoria = { categoryId: dados.categoryId, subcategoryId: dados.subcategoryId }
      if (dados.tipo === 'tarefa') {
        const tarefa = dividirTexto(dados.texto)
        await capturar({ tipo: 'tarefa', data: dados.data, ...categoria, ...tarefa, anexos })
      } else if (dados.tipo === 'grupo') {
        const titulo = primeiraLinha(dados.texto).trim()
        await capturar({
          tipo: 'grupo',
          titulo,
          data: dados.data,
          ...categoria,
          itens: dados.itens,
        })
      } else {
        const grupo = series.find((opcao) => opcao.serie.id === dados.seriesId)
        await capturar(
          {
            tipo: 'em-grupo',
            seriesId: dados.seriesId ?? '',
            data: dados.data,
            itens: dados.itens,
          },
          grupo?.serie.titulo,
        )
      }
    } catch (falha) {
      if (falha instanceof ErroDeValidacao) {
        setError(dados.tipo === 'em-grupo' ? 'itens' : 'texto', { message: falha.message })
        focarCampoPrincipal()
        return
      }
      throw falha
    }
    reset(valoresIniciais(hoje))
    setAnexos([])
    focarCampoPrincipal()
  }

  function criar() {
    return handleSubmit(handleCriar, (falhas) => {
      // Só falta o grupo: abre a lista para escolher.
      if (falhas.seriesId && !falhas.texto && !falhas.itens) setIsSeletorDeGrupoAberto(true)
      else focarCampoPrincipal()
    })()
  }

  /** Enter cria; Shift+Enter quebra a linha (fora durante a composição de acentos). */
  function handleKeyDown(evento: KeyboardEvent<HTMLTextAreaElement>) {
    if (evento.key !== 'Enter' || evento.shiftKey || evento.nativeEvent.isComposing) return
    evento.preventDefault()
    void criar()
  }

  function handleEscolherTipo(novo: TipoCaptura) {
    if (novo === 'grupo') setValue('texto', semLinhasVaziasNoTopo(getValues('texto')))
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
      <form
        noValidate
        onSubmit={(evento) => {
          evento.preventDefault()
          void criar()
        }}
      >
        <div className="flex items-start gap-3">
          <Plus
            aria-hidden
            className={cn('size-6 shrink-0 text-caneta', tipo === 'tarefa' ? 'mt-1' : 'mt-1.5')}
          />
          <div className="min-h-24 min-w-0 flex-1">
            {tipo === 'tarefa' ? (
              <textarea
                {...register('texto')}
                onKeyDown={handleKeyDown}
                rows={3}
                autoFocus
                autoComplete="off"
                aria-label="Título da tarefa"
                aria-invalid={erro ? true : undefined}
                aria-describedby={erro ? idErro : undefined}
                aria-keyshortcuts="Control+K N"
                placeholder={DICA_DO_CAMPO.tarefa}
                className="field-sizing-content block max-h-80 min-h-[3lh] w-full resize-none bg-transparent text-xl leading-8 font-medium tracking-[-0.01em] caret-caneta outline-none placeholder:font-normal placeholder:text-grafite/70"
              />
            ) : (
              <ItensDaCaptura
                ref={itensRef}
                nome={
                  tipo === 'grupo'
                    ? {
                        valor: primeiraLinha(texto),
                        onMudar: (nome) =>
                          setValue('texto', trocarPrimeiraLinha(getValues('texto'), nome), {
                            shouldValidate: Boolean(errors.texto),
                          }),
                        isInvalido: Boolean(errors.texto),
                      }
                    : undefined
                }
                dica={DICA_DO_CAMPO[tipo]}
                itens={itens}
                onMudarItens={(novos) =>
                  setValue('itens', novos, { shouldValidate: Boolean(errors.itens) })
                }
                isItensInvalidos={Boolean(errors.itens)}
                onCriar={() => void criar()}
                idErro={idErro}
              />
            )}
          </div>
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
                itensRef.current?.focar()
              }}
              isInvalido={Boolean(errors.seriesId)}
            />
          ) : (
            <CampoCategoria
              tipo="grupo"
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
