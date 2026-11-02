import { useState, type ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from 'cn'
import { IndicadorNotas } from '@/components/notas/indicador-notas'
import { CampoNovoItem } from '@/components/campo-novo-item'
import { TituloEditavel } from '@/components/titulo-editavel'
import { Checkbox } from '@/components/ui/checkbox'
import type { DataLocal } from '@/db/types'
import { useCategoriasDoContexto } from '@/hooks/contexto-categorias'
import { classificarTarefa } from '@/lib/categorias'
import { ErroDeValidacao } from '@/lib/erros'
import {
  isGrupoEncerrado,
  podeCopiarGrupo,
  progressoDoGrupo,
  textoProgressoGrupo,
  type GrupoDoDia,
} from '@/lib/grupos'
import { useAcoesGrupo } from '@/features/dia/hooks/use-acoes-grupo'
import { useSelecaoDaFolha } from '@/features/dia/hooks/use-selecao'
import { LinhaItem } from '@/features/dia/components/linha-item'
import { MenuGrupo } from '@/features/dia/components/menu-grupo'
import { useCorNaTela } from '@/hooks/use-cor-na-tela'

interface CardGrupoProps {
  grupo: GrupoDoDia
  hoje: DataLocal
  /** Alça de arrastar o card (reordena no dia). */
  alca?: ReactNode
  /** Itens pendentes ordenáveis; sem ele, são mostrados parados. */
  pendentes?: ReactNode
}

/**
 * Card de um grupo no dia, como uma ficha presa na folha: borda de cima na cor da categoria,
 * título, progresso, recolher e itens. A barra sob o cabeçalho enche conforme os itens saem
 * do dia (feitos ou transferidos). Encerrado fica discreto: é o registro do que aconteceu.
 */
export function CardGrupo({ grupo, hoje, alca, pendentes }: CardGrupoProps) {
  const { card, serie } = grupo
  const isEncerrado = isGrupoEncerrado(grupo)
  const [isRecolhido, setIsRecolhido] = useState(false)
  const [isEditando, setIsEditando] = useState(false)
  const { renomearGrupo, criarItem } = useAcoesGrupo()
  const { isSelecionando, selecionados, alternar } = useSelecaoDaFolha()
  const classificacao = classificarTarefa(serie, useCategoriasDoContexto())
  const corNaTela = useCorNaTela()
  const progresso = progressoDoGrupo(grupo)
  const total = progresso.pendentes + progresso.feitos + progresso.transferidos
  const fracao = total === 0 ? 0 : (progresso.feitos + progresso.transferidos) / total
  const idItens = `itens-${card.id}`
  const isSelecionavel = isSelecionando && podeCopiarGrupo(grupo)
  const isSelecionado = isSelecionavel && selecionados.has(card.id)
  const cor = classificacao ? corNaTela(classificacao.cor) : 'var(--grafite)'
  const itensParados = grupo.itens.filter((item) => item.status !== 'pendente')

  async function handleSalvarTitulo(titulo: string) {
    setIsEditando(false)
    if (titulo === serie.titulo) return
    try {
      await renomearGrupo(serie.id, titulo)
    } catch (erro) {
      toast.error(erro instanceof ErroDeValidacao ? erro.message : 'Não foi possível renomear.')
    }
  }

  return (
    <section
      aria-label={`Grupo ${serie.titulo}`}
      className={cn(
        'relative my-3 rounded-md border border-pauta bg-papel',
        isEncerrado ? 'shadow-none' : 'shadow-[3px_3px_0_var(--marca-texto)]',
        isSelecionado && 'bg-accent',
      )}
    >
      {/* Borda de cima da ficha, na cor da categoria. */}
      <span
        aria-hidden
        className={cn(
          'absolute -inset-x-px -top-px h-[3px] rounded-t-md',
          isEncerrado && 'opacity-40',
        )}
        style={{ backgroundColor: cor }}
      />
      {/* Selecionando, o título e o fundo do cabeçalho marcam o card (todos os pendentes). */}
      <div
        onClick={(evento) => {
          if (isSelecionavel && evento.target === evento.currentTarget) alternar(card.id)
        }}
        className={cn(
          'group/cabecalho relative flex min-h-12 items-center gap-1 pt-1 pr-2 pb-1.5 pl-1',
          isSelecionavel && 'cursor-pointer',
        )}
      >
        <span className="flex w-5 shrink-0 justify-center">{!isSelecionavel && alca}</span>
        {isSelecionavel ? (
          <Checkbox
            checked={isSelecionado}
            onCheckedChange={() => alternar(card.id)}
            aria-label={`Selecionar grupo ${serie.titulo}`}
            className="mx-1 size-5 rounded-full border-2 border-caneta data-[state=checked]:bg-caneta"
          />
        ) : (
          <button
            type="button"
            onClick={() => setIsRecolhido((atual) => !atual)}
            aria-expanded={!isRecolhido}
            aria-controls={idItens}
            aria-label={isRecolhido ? `Abrir ${serie.titulo}` : `Recolher ${serie.titulo}`}
            className="flex size-7 shrink-0 items-center justify-center rounded-sm text-grafite hover:text-tinta focus-visible:outline-2 focus-visible:outline-caneta"
          >
            <ChevronRight
              aria-hidden
              className={cn(
                'size-4 transition-transform motion-reduce:transition-none',
                !isRecolhido && 'rotate-90',
              )}
            />
          </button>
        )}
        <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-3 py-2 pl-1">
          <TituloEditavel
            titulo={serie.titulo}
            isEditando={isEditando}
            onIniciarEdicao={() => (isSelecionavel ? alternar(card.id) : setIsEditando(true))}
            onSalvar={(titulo) => void handleSalvarTitulo(titulo)}
            onCancelar={() => setIsEditando(false)}
            className={cn(
              'text-lg leading-tight font-extrabold tracking-[-0.01em] [font-stretch:85%]',
              isEncerrado && 'text-grafite',
              isSelecionavel && 'cursor-pointer',
            )}
          />
          {!isEditando && (
            <IndicadorNotas
              vinculo={{ tipo: 'grupo', id: serie.id }}
              titulo={serie.titulo}
              className="self-center"
            />
          )}
          {!isEditando && total > 0 && (
            <span className="text-sm text-grafite tabular-nums">
              {textoProgressoGrupo(progresso)}
            </span>
          )}
          {!isEditando && isEncerrado && (
            <span className="text-sm text-grafite italic">encerrado</span>
          )}
          {!isEditando && classificacao && (
            <span className="flex items-center gap-1.5 self-center text-sm whitespace-nowrap text-grafite">
              <span
                aria-hidden
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: cor }}
              />
              {classificacao.rotulo}
            </span>
          )}
        </div>
        {!isSelecionavel && (
          <MenuGrupo grupo={grupo} hoje={hoje} onRenomear={() => setIsEditando(true)} />
        )}
        <span
          aria-hidden
          className="absolute right-3 bottom-0 left-3 h-[3px] overflow-hidden rounded-full bg-pauta"
        >
          <span
            className={cn(
              'block h-full rounded-full bg-caneta transition-[width] duration-300 motion-reduce:transition-none',
              isEncerrado && 'opacity-40',
            )}
            style={{ width: `${fracao * 100}%` }}
          />
        </span>
      </div>

      <div id={idItens} hidden={isRecolhido} className="pl-6">
        {pendentes ?? (
          <ul aria-label={`Itens de ${serie.titulo}`}>
            {grupo.itens
              .filter((item) => item.status === 'pendente')
              .map((item) => (
                <li key={item.id}>
                  <LinhaItem item={item} data={card.data} hoje={hoje} />
                </li>
              ))}
          </ul>
        )}
        {itensParados.length > 0 && (
          <ul aria-label={`Feitos e transferidos de ${serie.titulo}`}>
            {itensParados.map((item) => (
              <li key={item.id}>
                <LinhaItem item={item} data={card.data} hoje={hoje} />
              </li>
            ))}
          </ul>
        )}
        {!isSelecionando && (
          <div className="flex items-center pl-1">
            <span className="w-5 shrink-0" />
            <div className="min-w-0 flex-1 pl-2">
              <CampoNovoItem
                rotulo="Adicionar item"
                nomeAcessivel={`Adicionar item em ${serie.titulo}`}
                tamanho="compacto"
                onCriar={(titulo) => criarItem(card.id, titulo)}
              />
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
