import { useState, type ReactNode } from 'react'
import { ListChecks, Plus } from 'lucide-react'
import { cn } from 'cn'
import { CampoNovoItem } from '@/components/campo-novo-item'
import { Checkbox } from '@/components/ui/checkbox'
import type { GroupItem, Task } from '@/db/types'
import { useCategoriasDoContexto } from '@/hooks/contexto-categorias'
import { classificarTarefa } from '@/lib/categorias'
import { pendentesDo, progressoDoGrupo, type EntradaDoDia, type GrupoDoDia } from '@/lib/grupos'
import { ResumoLateral } from '@/features/inicio/components/resumo-lateral'
import { useAcoesDoInicio } from '@/features/inicio/hooks/use-acoes-do-inicio'
import { useCorNaTela } from '@/hooks/use-cor-na-tela'

interface BlocoHojeProps {
  entradas: EntradaDoDia[]
}

function PontoDaCategoria({ dono }: { dono: Pick<Task, 'categoryId' | 'subcategoryId'> }) {
  const classificacao = classificarTarefa(dono, useCategoriasDoContexto())
  const corNaTela = useCorNaTela()
  if (!classificacao) return null
  return (
    <span
      aria-hidden
      title={classificacao.rotulo}
      className="size-1.5 shrink-0 rounded-full"
      style={{ backgroundColor: corNaTela(classificacao.cor) }}
    />
  )
}

function LinhaMarcavel({
  titulo,
  isFeita,
  onMarcar,
  recuo,
  children,
}: {
  titulo: string
  isFeita: boolean
  onMarcar: (isFeita: boolean) => void
  recuo?: boolean
  children?: ReactNode
}) {
  return (
    <li className={cn('flex min-h-8 items-center gap-2.5 text-sm', recuo && 'ml-6 min-h-7')}>
      <Checkbox
        checked={isFeita}
        aria-label={titulo}
        onCheckedChange={(marcado) => onMarcar(marcado === true)}
      />
      <span className={cn('min-w-0 flex-1 truncate', isFeita && 'text-grafite line-through')}>
        {titulo}
      </span>
      {children}
    </li>
  )
}

function itensVisiveis(grupo: GrupoDoDia): GroupItem[] {
  return grupo.itens.filter((item) => item.status === 'pendente' || item.status === 'concluido')
}

/**
 * Card de hoje: título, progresso e itens marcáveis. "+ Adicionar item" aparece ao passar o
 * mouse (ou com foco) e põe o item no fim do card, pela mesma regra da captura.
 */
function GrupoDeHoje({ grupo }: { grupo: GrupoDoDia }) {
  const { definirConclusaoItem, adicionarItem } = useAcoesDoInicio()
  const [isAdicionando, setIsAdicionando] = useState(false)
  const { serie, card } = grupo
  const itens = itensVisiveis(grupo)

  return (
    <li aria-label={`Grupo ${serie.titulo}`} className="group/grupo">
      <div className="flex min-h-8 items-center gap-2.5 text-sm">
        <ListChecks aria-hidden className="size-4 shrink-0 text-grafite" />
        <span className="min-w-0 flex-1 truncate font-semibold">{serie.titulo}</span>
        <button
          type="button"
          aria-label={`Adicionar item em ${serie.titulo}`}
          title="Adicionar item"
          onClick={() => setIsAdicionando(true)}
          className="flex size-6 items-center justify-center rounded text-grafite opacity-0 group-focus-within/grupo:opacity-100 group-hover/grupo:opacity-100 hover:bg-accent hover:text-tinta focus-visible:opacity-100"
        >
          <Plus aria-hidden className="size-3.5" />
        </button>
        <span className="text-xs text-grafite tabular-nums">
          {progressoDoGrupo(grupo).feitos}/{itens.length}
        </span>
        <PontoDaCategoria dono={serie} />
      </div>
      <ul>
        {itens.map((item) => (
          <LinhaMarcavel
            key={item.id}
            titulo={item.titulo}
            isFeita={item.status === 'concluido'}
            onMarcar={(isFeita) => void definirConclusaoItem(item.id, isFeita)}
            recuo
          />
        ))}
      </ul>
      {isAdicionando && (
        <div className="ml-5 text-sm">
          <CampoNovoItem
            rotulo="Adicionar item"
            nomeAcessivel={`Novo item em ${serie.titulo}`}
            tamanho="compacto"
            autoFocus
            onCriar={(titulo) => adicionarItem(serie.id, card.data, titulo)}
            onSairVazio={() => setIsAdicionando(false)}
          />
        </div>
      )}
    </li>
  )
}

/** O que está em hoje (tarefas e grupos), marcável ali mesmo. */
export function BlocoHoje({ entradas }: BlocoHojeProps) {
  const { definirConclusao } = useAcoesDoInicio()
  const pendentes = entradas.reduce(
    (soma, entrada) =>
      soma +
      (entrada.tipo === 'tarefa'
        ? Number(entrada.tarefa.status === 'pendente')
        : pendentesDo(entrada.grupo).length),
    0,
  )
  const visiveis = entradas.filter(
    (entrada) => entrada.tipo === 'tarefa' || itensVisiveis(entrada.grupo).length > 0,
  )

  return (
    <ResumoLateral
      titulo="Hoje"
      extra={
        visiveis.length > 0 && (
          <span className="text-xs text-grafite tabular-nums">
            {pendentes === 0
              ? 'nada pendente'
              : `${pendentes} ${pendentes === 1 ? 'pendente' : 'pendentes'}`}
          </span>
        )
      }
    >
      {visiveis.length === 0 ? (
        <p className="py-2 text-sm text-grafite">Nada para hoje. Anote algo ao lado.</p>
      ) : (
        <ul className="pt-1">
          {visiveis.map((entrada) =>
            entrada.tipo === 'tarefa' ? (
              <LinhaMarcavel
                key={entrada.tarefa.id}
                titulo={entrada.tarefa.titulo}
                isFeita={entrada.tarefa.status === 'concluida'}
                onMarcar={(isFeita) => void definirConclusao(entrada.tarefa.id, isFeita)}
              >
                <PontoDaCategoria dono={entrada.tarefa} />
              </LinhaMarcavel>
            ) : (
              <GrupoDeHoje key={entrada.grupo.card.id} grupo={entrada.grupo} />
            ),
          )}
        </ul>
      )}
    </ResumoLateral>
  )
}
