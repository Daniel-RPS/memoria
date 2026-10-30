import { useState, type ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from 'cn'
import { CampoNovoItem } from '@/components/campo-novo-item'
import { TituloEditavel } from '@/components/titulo-editavel'
import { Checkbox } from '@/components/ui/checkbox'
import type { DataLocal, Subtask } from '@/db/types'
import { useCategoriasDoContexto } from '@/hooks/contexto-categorias'
import { classificarTarefa } from '@/lib/categorias'
import { ErroDeValidacao } from '@/lib/erros'
import {
  isGrupoConcluido,
  progressoDoGrupo,
  textoProgressoGrupo,
  type GrupoDoDia,
} from '@/lib/grupos'
import { useAcoesGrupo } from '@/features/dia/hooks/use-acoes-grupo'
import { useSelecaoDaFolha } from '@/features/dia/hooks/use-selecao'
import { LinhaTarefa } from '@/features/dia/components/linha-tarefa'
import { MenuGrupo } from '@/features/dia/components/menu-grupo'

interface CardGrupoProps {
  grupo: GrupoDoDia
  hoje: DataLocal
  subtarefasPorTarefa: Map<string, Subtask[]>
  /** Alça de arrastar o card inteiro; ausente nos cards concluídos. */
  alca?: ReactNode
  /** Itens pendentes (ordenáveis); sem ele, são mostrados parados. */
  pendentes?: ReactNode
}

const SEM_SUBTAREFAS: Subtask[] = []

/**
 * Card de um grupo no dia: faixa da categoria, título, progresso, recolher e itens.
 * A linha de baixo do cabeçalho enche na cor da categoria conforme os itens são feitos.
 */
export function CardGrupo({ grupo, hoje, subtarefasPorTarefa, alca, pendentes }: CardGrupoProps) {
  const { instancia, serie } = grupo
  const isConcluido = isGrupoConcluido(grupo)
  const [isRecolhido, setIsRecolhido] = useState(isConcluido)
  const [isEditando, setIsEditando] = useState(false)
  const { renomearGrupo, criarItem } = useAcoesGrupo()
  const { isSelecionando, selecionados, alternar } = useSelecaoDaFolha()
  const classificacao = classificarTarefa(serie, useCategoriasDoContexto())
  const progresso = progressoDoGrupo(grupo)
  const fracao = progresso.total === 0 ? 0 : progresso.concluidas / progresso.total
  const idItens = `itens-${instancia.id}`
  const isSelecionavel = isSelecionando && !isConcluido
  const isSelecionado = isSelecionavel && selecionados.has(instancia.id)

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
        'relative border-b border-pauta',
        isConcluido && 'text-grafite',
        isSelecionado && 'bg-accent',
      )}
    >
      <span
        aria-hidden
        className={cn('absolute inset-y-0 left-0 w-1.5', isConcluido && 'opacity-50')}
        style={{ backgroundColor: classificacao?.cor ?? 'var(--grafite)' }}
      />
      <div className="group/cabecalho relative flex min-h-12 items-center gap-1 pr-2 pl-1">
        <span className="flex w-5 shrink-0 justify-center">{!isSelecionavel && alca}</span>
        {isSelecionavel ? (
          <Checkbox
            checked={isSelecionado}
            onCheckedChange={() => alternar(instancia.id)}
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
            onIniciarEdicao={() => setIsEditando(true)}
            onSalvar={(titulo) => void handleSalvarTitulo(titulo)}
            onCancelar={() => setIsEditando(false)}
            className="text-lg leading-tight font-extrabold tracking-[-0.01em] [font-stretch:85%]"
          />
          {!isEditando && progresso.total > 0 && (
            <span
              className="text-sm text-grafite tabular-nums"
              aria-label={`${progresso.concluidas} de ${progresso.total} itens feitos`}
            >
              {textoProgressoGrupo(progresso)}
            </span>
          )}
          {!isEditando && classificacao && (
            <span className="text-sm whitespace-nowrap text-grafite">{classificacao.rotulo}</span>
          )}
        </div>
        {!isSelecionavel && (
          <MenuGrupo grupo={grupo} hoje={hoje} onRenomear={() => setIsEditando(true)} />
        )}
        <span aria-hidden className="absolute inset-x-0 bottom-0 left-1.5 h-0.5 bg-pauta/60">
          <span
            className="block h-full transition-[width] duration-300 motion-reduce:transition-none"
            style={{
              width: `${fracao * 100}%`,
              backgroundColor: classificacao?.cor ?? 'var(--caneta)',
            }}
          />
        </span>
      </div>

      <div id={idItens} hidden={isRecolhido} className="bg-nevoa/40 pl-6">
        {pendentes ?? (
          <ul aria-label={`Itens de ${serie.titulo}`}>
            {grupo.pendentes.map((item) => (
              <li key={item.id}>
                <LinhaTarefa
                  tarefa={item}
                  subtarefas={subtarefasPorTarefa.get(item.id) ?? SEM_SUBTAREFAS}
                  hoje={hoje}
                />
              </li>
            ))}
          </ul>
        )}
        {grupo.concluidas.length > 0 && (
          <ul aria-label={`Itens feitos de ${serie.titulo}`}>
            {grupo.concluidas.map((item) => (
              <li key={item.id}>
                <LinhaTarefa
                  tarefa={item}
                  subtarefas={subtarefasPorTarefa.get(item.id) ?? SEM_SUBTAREFAS}
                  hoje={hoje}
                />
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
                onCriar={(titulo) => criarItem(instancia.id, titulo)}
              />
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
