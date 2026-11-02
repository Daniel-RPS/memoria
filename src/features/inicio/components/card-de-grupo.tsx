import { useState, type CSSProperties } from 'react'
import { ListChecks, Plus } from 'lucide-react'
import { Link } from 'react-router'
import { CampoNovoItem } from '@/components/campo-novo-item'
import { useCategoriasDoContexto } from '@/hooks/contexto-categorias'
import { useCorDeTraco } from '@/hooks/use-cor-na-tela'
import { classificarTarefa } from '@/lib/categorias'
import type { GrupoDoResumo } from '@/lib/inicio'
import { BotaoTrazer, LinhaMarcavel, SeloHaDias } from '@/features/inicio/components/linha-marcavel'
import { useAcoesDoInicio } from '@/features/inicio/hooks/use-acoes-do-inicio'

interface CardDeGrupoProps {
  resumo: GrupoDoResumo
  /** Em Atrasadas: mostra "há X dias" nos itens e troca o "+" por "Trazer pendentes para hoje". */
  onTrazer?: () => void
}

/**
 * Card de um grupo no Início: faixa e barra de progresso na cor da categoria (neutra sem
 * categoria), nome que abre o Dia, "1/3" e itens marcáveis (feitos riscados no fim).
 */
export function CardDeGrupo({ resumo, onTrazer }: CardDeGrupoProps) {
  const { definirConclusaoItem, adicionarItem } = useAcoesDoInicio()
  const [isAdicionando, setIsAdicionando] = useState(false)
  const classificacao = classificarTarefa(resumo.grupo.serie, useCategoriasDoContexto())
  const corDeTraco = useCorDeTraco()
  const { serie, card } = resumo.grupo
  const isAtrasado = onTrazer !== undefined
  const cor = classificacao ? corDeTraco(classificacao.cor) : 'var(--grafite)'
  const porcentagem = resumo.total === 0 ? 0 : (resumo.feitos / resumo.total) * 100

  return (
    <li
      aria-label={`Grupo ${serie.titulo}`}
      className="group/grupo relative overflow-hidden rounded-md border border-pauta bg-card py-1.5 pr-2 pl-3"
      style={{ '--cor-do-grupo': cor } as CSSProperties}
    >
      <span
        aria-hidden
        title={classificacao?.rotulo}
        className="absolute inset-y-0 left-0 w-[3px] bg-(--cor-do-grupo)"
      />
      <div className="flex min-h-7 items-start gap-2 text-sm leading-5">
        <ListChecks aria-hidden className="mt-0.5 size-4 shrink-0 text-grafite" />
        <Link
          to={`/dia/${card.data}`}
          title={`Abrir ${serie.titulo} no dia`}
          className="min-w-0 flex-1 py-px font-semibold break-words hover:underline"
        >
          {serie.titulo}
        </Link>
        {isAtrasado ? (
          <BotaoTrazer
            rotulo={`Trazer pendentes de ${serie.titulo} para hoje`}
            dica="Trazer pendentes para hoje"
            onTrazer={onTrazer}
            revelarCom="grupo"
          />
        ) : (
          <button
            type="button"
            aria-label={`Adicionar item em ${serie.titulo}`}
            title="Adicionar item"
            onClick={() => setIsAdicionando(true)}
            className="-my-0.5 flex size-6 shrink-0 items-center justify-center rounded text-grafite opacity-0 group-focus-within/grupo:opacity-100 group-hover/grupo:opacity-100 hover:bg-accent hover:text-tinta focus-visible:opacity-100"
          >
            <Plus aria-hidden className="size-3.5" />
          </button>
        )}
        <span className="py-px text-xs text-grafite tabular-nums">
          {resumo.feitos}/{resumo.total}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={`Progresso de ${serie.titulo}`}
        aria-valuemin={0}
        aria-valuemax={resumo.total}
        aria-valuenow={resumo.feitos}
        className="mt-1 mb-1 h-1 overflow-hidden rounded-full bg-pauta"
      >
        <div
          className="h-full origin-left rounded-full bg-(--cor-do-grupo) transition-transform duration-300 ease-mola-suave motion-reduce:transition-none"
          style={{ transform: `scaleX(${porcentagem / 100})` }}
        />
      </div>
      <ul>
        {resumo.itens.map(({ item, isFeito, dias }) => (
          <LinhaMarcavel
            key={item.id}
            titulo={item.titulo}
            isFeita={isFeito}
            onMarcar={(isFeita) => void definirConclusaoItem(item.id, isFeita)}
            selo={isAtrasado && dias !== null && <SeloHaDias dias={dias} />}
          />
        ))}
      </ul>
      {isAdicionando && (
        <div className="text-sm">
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
