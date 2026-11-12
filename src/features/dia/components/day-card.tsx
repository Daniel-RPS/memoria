import { useState, type ReactNode } from 'react'
import { Folder } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from 'cn'
import { IndicadorNotas } from '@/components/notas/indicador-notas'
import { useDuploCliqueParaEditar } from '@/hooks/use-duplo-clique-para-editar'
import { TituloEditavel } from '@/components/titulo-editavel'
import { Checkbox } from '@/components/ui/checkbox'
import type { DataLocal } from '@/db/types'
import { PontoDeAndamento } from '@/components/indicador-andamento'
import { IndicadorPrioridade } from '@/components/indicador-prioridade'
import { contarPrioritarios } from '@/domain/prioridade'
import { contarEmAndamento } from '@/lib/andamento'
import { useCategoriasDoContexto } from '@/hooks/contexto-categorias'
import { classificarTarefa } from '@/lib/categorias'
import { ErroDeValidacao } from '@/lib/erros'
import {
  isGrupoEncerrado,
  podeCopiarGrupo,
  progressoDoGrupo,
  type GrupoDoDia,
} from '@/lib/grupos'
import { useAcoesGrupo } from '@/features/dia/hooks/use-acoes-grupo'
import { useSelecaoDaFolha } from '@/features/dia/hooks/use-selecao'
import { MenuGrupo } from '@/features/dia/components/menu-grupo'
import { useCorNaTela } from '@/hooks/use-cor-na-tela'

export interface DayCardProps {
  grupo: GrupoDoDia
  titulo: string
  hoje: DataLocal
  /** Alça de arrastar o card (reordena no dia / leva para outro dia). */
  alca?: ReactNode
  /** Total de itens pendentes no cartão. */
  totalPendentes?: number
  /** Linhas dos itens pendentes em grade (já ordenados por prioridade/andamento/manual). */
  pendentes: ReactNode
  /** Linhas dos itens concluídos / parados (recolhível). */
  concluidas?: ReactNode
  subtitulo?: string
  className?: string
}

/**
 * Caixa tingida de grupo no modo "Cartões" do Dia:
 * - Fundo tingido pela cor da categoria (~8–10% sobre superfície via color-mix).
 * - Borda fina na cor da categoria a ~30% e faixa de 4px na esquerda (sem categoria: destaque do tema).
 * - Cabeçalho: ícone de pasta (lucide Folder) num quadradinho arredondado de ~30px,
 *   nome do grupo em 16px semibold, abaixo bolinha + categoria.
 *   À direita: prioridade, andamento, contagem "1/4", mini barra de progresso (~56px), "· N transferidos" e menu ⋯.
 */
export function DayCard({
  grupo,
  titulo,
  hoje,
  alca,
  totalPendentes: _totalPendentes,
  pendentes,
  concluidas,
  subtitulo,
  className,
}: DayCardProps) {
  const [isEditandoTitulo, setIsEditandoTitulo] = useState(false)
  const { renomearGrupo } = useAcoesGrupo()
  const { isSelecionando, selecionados, alternar } = useSelecaoDaFolha()
  const categorias = useCategoriasDoContexto()
  const corNaTela = useCorNaTela()

  const card = grupo.card
  const serie = grupo.serie
  const isEncerrado = isGrupoEncerrado(grupo)
  const emAndamento = contarEmAndamento(grupo.itens)
  const prioritarios = contarPrioritarios(grupo.itens)
  const classificacao = classificarTarefa(serie, categorias)
  const corBase = classificacao ? corNaTela(classificacao.cor) : 'var(--color-caneta)'

  const isSelecionavel = isSelecionando && podeCopiarGrupo(grupo)
  const isSelecionado = isSelecionavel && selecionados.has(card.id)

  const progresso = progressoDoGrupo(grupo)
  const totalItens = progresso.pendentes + progresso.feitos + progresso.transferidos
  const percentualFeito = totalItens > 0 ? Math.round((progresso.feitos / totalItens) * 100) : 0

  async function handleSalvarTitulo(novoTitulo: string) {
    setIsEditandoTitulo(false)
    if (novoTitulo === serie.titulo) return
    try {
      await renomearGrupo(serie.id, novoTitulo)
    } catch (erro) {
      toast.error(erro instanceof ErroDeValidacao ? erro.message : 'Não foi possível renomear.')
    }
  }

  const duploClique = useDuploCliqueParaEditar(
    () => setIsEditandoTitulo(true),
    !isEditandoTitulo && !isSelecionavel,
  )

  return (
    <article
      aria-label={`Grupo ${titulo}`}
      className={cn(
        'group/cartao relative flex w-full flex-col overflow-hidden rounded-lg transition-colors motion-reduce:transition-none',
        isSelecionado && 'ring-2 ring-caneta',
        className,
      )}
      style={{
        backgroundColor: `color-mix(in srgb, ${corBase} 9%, var(--color-papel))`,
        borderColor: `color-mix(in srgb, ${corBase} 32%, var(--color-pauta))`,
        borderWidth: '1px',
        borderStyle: 'solid',
      }}
    >
      {/* Faixa de 4px na cor da categoria na esquerda */}
      <span
        aria-hidden
        data-faixa
        className="absolute inset-y-0 left-0 w-1"
        style={{ backgroundColor: corBase }}
      />

      {/* Cabeçalho do grupo */}
      <header
        {...duploClique}
        onClick={(evento) => {
          if (isSelecionavel && evento.target === evento.currentTarget) {
            alternar(card.id)
          }
        }}
        className={cn(
          'group/cabecalho relative flex min-h-12 items-center gap-2 border-b px-3.5 pt-2.5 pb-2.5 pl-4',
          isSelecionavel && 'cursor-pointer',
        )}
        style={{
          borderColor: `color-mix(in srgb, ${corBase} 22%, var(--color-pauta))`,
        }}
      >
        <span className="flex w-5 shrink-0 justify-center">{!isSelecionavel && alca}</span>
        {isSelecionavel ? (
          <Checkbox
            checked={isSelecionado}
            onCheckedChange={() => alternar(card.id)}
            aria-label={`Selecionar grupo ${titulo}`}
            className="mx-1 size-5 rounded-full border-2 border-caneta data-[state=checked]:bg-caneta"
          />
        ) : null}

        {/* Ícone de pasta em quadradinho arredondado de ~30px tingido */}
        <div
          aria-hidden
          className="flex size-[30px] shrink-0 items-center justify-center rounded-md"
          style={{
            backgroundColor: `color-mix(in srgb, ${corBase} 22%, var(--color-papel))`,
            color: corBase,
          }}
        >
          <Folder className="size-4" />
        </div>

        {/* Informações centrais: Título (16px semibold) e linha pequena de categoria */}
        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <div className="flex min-w-0 items-center gap-2">
            <TituloEditavel
              isComLinks
              titulo={titulo}
              isEditando={isEditandoTitulo}
              onIniciarEdicao={() => (isSelecionavel ? alternar(card.id) : setIsEditandoTitulo(true))}
              onSalvar={(t) => void handleSalvarTitulo(t)}
              onCancelar={() => setIsEditandoTitulo(false)}
              className={cn(
                'text-base font-semibold leading-snug break-words',
                isEncerrado && 'text-grafite',
                isSelecionavel && 'cursor-pointer',
              )}
            />
            {!isEditandoTitulo && (
              <IndicadorNotas
                vinculo={{ tipo: 'grupo', id: serie.id }}
                titulo={serie.titulo}
                className="self-center"
              />
            )}
          </div>

          <div className="flex items-center gap-1.5 text-xs text-grafite">
            {classificacao ? (
              <>
                <span
                  aria-hidden
                  data-cor
                  className={cn('size-2 shrink-0 rounded-full', isEncerrado && 'opacity-40')}
                  style={{ backgroundColor: corBase }}
                />
                <span className="truncate">{classificacao.rotulo}</span>
              </>
            ) : (
              <span className="italic">Sem categoria</span>
            )}
            {isEncerrado && <span className="italic">· encerrado</span>}
          </div>
        </div>

        {/* Lado direito do cabeçalho: prioridade, andamento, contagem, mini barra de progresso, transferidos e menu */}
        <div className="flex items-center gap-2">
          {prioritarios > 0 && (
            <IndicadorPrioridade
              rotulo={
                prioritarios === 1
                  ? '1 item prioritário'
                  : `${prioritarios} itens prioritários`
              }
            />
          )}
          {emAndamento > 0 && (
            <PontoDeAndamento
              rotulo={
                emAndamento === 1
                  ? '1 item em andamento'
                  : `${emAndamento} itens em andamento`
              }
            />
          )}

          {/* Contagem e mini barra de progresso */}
          <div className="flex items-center gap-1.5 text-xs text-grafite">
            <span className="tabular-nums font-medium">
              {progresso.feitos}/{totalItens}
            </span>
            <div
              role="progressbar"
              aria-valuenow={percentualFeito}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Progresso: ${percentualFeito}%`}
              className="h-1.5 w-14 overflow-hidden rounded-full bg-pauta/80"
            >
              <div
                className="h-full rounded-full transition-all duration-300 motion-reduce:transition-none"
                style={{
                  width: `${percentualFeito}%`,
                  backgroundColor: corBase,
                }}
              />
            </div>
            {progresso.transferidos > 0 && (
              <span className="hidden text-[0.6875rem] text-grafite sm:inline">
                · {progresso.transferidos} transferidos
              </span>
            )}
          </div>

          {!isSelecionavel && (
            <MenuGrupo
              grupo={grupo}
              hoje={hoje}
              onRenomear={() => setIsEditandoTitulo(true)}
            />
          )}
        </div>
      </header>

      {/* Grade interna de cartões */}
      <div className="p-3 pl-4">
        {pendentes}

        {subtitulo && (
          <p className="py-2 text-xs text-grafite italic">{subtitulo}</p>
        )}

        {/* Concluídas (bloco recolhível) */}
        {concluidas}
      </div>
    </article>
  )
}
