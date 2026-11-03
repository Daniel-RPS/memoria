import { useState, type ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from 'cn'
import { IndicadorNotas } from '@/components/notas/indicador-notas'
import { CampoNovoItem } from '@/components/campo-novo-item'
import { IconeDaEntidade } from '@/components/icones/icone-da-entidade'
import { TituloEditavel } from '@/components/titulo-editavel'
import { Checkbox } from '@/components/ui/checkbox'
import type { DataLocal } from '@/db/types'
import { useGrupoDaVisita } from '@/hooks/use-grupos-da-visita'
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
 * Grupo no dia como uma linha simples: chevron, nome, progresso "0/2" e a bolinha com o nome da
 * categoria (a cor do grupo aparece só nela). Aberto, os itens ficam recuados sob o nome.
 * Encerrado fica discreto: é o registro do que aconteceu.
 */
export function CardGrupo({ grupo, hoje, alca, pendentes }: CardGrupoProps) {
  const { card, serie } = grupo
  const isEncerrado = isGrupoEncerrado(grupo)
  const { isAberto, handleAlternar } = useGrupoDaVisita(card.id)
  const isRecolhido = !isAberto
  const [isEditando, setIsEditando] = useState(false)
  const { renomearGrupo, criarItem } = useAcoesGrupo()
  const { isSelecionando, selecionados, alternar } = useSelecaoDaFolha()
  const classificacao = classificarTarefa(serie, useCategoriasDoContexto())
  const corNaTela = useCorNaTela()
  const progresso = progressoDoGrupo(grupo)
  const total = progresso.pendentes + progresso.feitos + progresso.transferidos
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
      className={cn('relative bg-papel', isSelecionado && 'bg-accent')}
    >
      {/* Selecionando, o título e o fundo do cabeçalho marcam o card (todos os pendentes). */}
      <div
        onClick={(evento) => {
          if (isSelecionavel && evento.target === evento.currentTarget) alternar(card.id)
        }}
        className={cn(
          'group/cabecalho relative flex min-h-11 items-center gap-1 border-b border-pauta pr-2 pl-1',
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
            onClick={handleAlternar}
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
        <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-3 py-1.5 pl-1">
          {classificacao?.icone && (
            <IconeDaEntidade icone={classificacao.icone} className="-mr-1.5 self-center" />
          )}
          <TituloEditavel
            titulo={serie.titulo}
            isEditando={isEditando}
            onIniciarEdicao={() => (isSelecionavel ? alternar(card.id) : setIsEditando(true))}
            onSalvar={(titulo) => void handleSalvarTitulo(titulo)}
            onCancelar={() => setIsEditando(false)}
            className={cn(
              'font-semibold',
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
                data-cor
                className={cn('size-2 shrink-0 rounded-full', isEncerrado && 'opacity-40')}
                style={{ backgroundColor: cor }}
              />
              {classificacao.rotulo}
            </span>
          )}
        </div>
        {!isSelecionavel && (
          <MenuGrupo grupo={grupo} hoje={hoje} onRenomear={() => setIsEditando(true)} />
        )}
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
