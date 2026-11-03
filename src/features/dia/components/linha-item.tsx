import { useState, type ReactNode } from 'react'
import { CornerDownRight } from 'lucide-react'
import { Link } from 'react-router'
import { cn } from 'cn'
import { FileteDeAndamento, IndicadorAndamento } from '@/components/indicador-andamento'
import { IndicadorNotas } from '@/components/notas/indicador-notas'
import { TituloEditavel } from '@/components/titulo-editavel'
import { Checkbox } from '@/components/ui/checkbox'
import type { DataLocal, GroupItem } from '@/db/types'
import { vinculoDoItem } from '@/lib/notas'
import { diaCurto, isPendenteDeAntes } from '@/lib/grupos'
import { useDataDoDestino } from '@/features/dia/hooks/contexto-extras'
import { useAcoesGrupo } from '@/features/dia/hooks/use-acoes-grupo'
import { useSelecaoDaFolha } from '@/features/dia/hooks/use-selecao'
import { MenuItemGrupo } from '@/features/dia/components/menu-item-grupo'

interface LinhaItemProps {
  item: GroupItem
  /** Dia do card. */
  data: DataLocal
  hoje: DataLocal
  /** Alça de arrastar; só nos pendentes. */
  alca?: ReactNode
}

/** Selo de atraso discreto: texto pequeno no tom de alerta, sem fundo. */
const SELO_DE_ATRASO = 'text-xs font-medium whitespace-nowrap text-alerta'

/**
 * Item de um card. Pendente: caixa e "pendente desde". Feito: riscado. Transferido: seta no
 * lugar da caixa, sem riscar, com a etiqueta que leva ao card do dia de destino.
 */
export function LinhaItem({ item, data, hoje, alca }: LinhaItemProps) {
  const { definirConclusaoItem, renomearItem } = useAcoesGrupo()
  const [isEditando, setIsEditando] = useState(false)
  const { isSelecionando, selecionados, alternar } = useSelecaoDaFolha()
  const dataDestino = useDataDoDestino(item.transferidoParaCardId)
  const isPendente = item.status === 'pendente'
  const isConcluido = item.status === 'concluido'
  const isTransferido = item.status === 'transferido'
  const isSelecionavel = isSelecionando && isPendente
  const isSelecionado = isSelecionavel && selecionados.has(item.id)
  const isAtrasado = isPendenteDeAntes(item, data, hoje)
  const isEmAndamento = isPendente && item.emAndamento === true

  function handleSalvarTitulo(titulo: string) {
    setIsEditando(false)
    if (titulo !== item.titulo) void renomearItem(item.id, titulo)
  }

  return (
    <div
      data-em-andamento={isEmAndamento || undefined}
      className={cn(
        'group/linha relative flex min-h-11 items-center gap-2 border-b border-pauta pr-2 pl-1',
        isSelecionado && 'bg-accent',
      )}
    >
      {isEmAndamento && <FileteDeAndamento />}
      <span className="flex w-5 shrink-0 justify-center">{!isSelecionavel && alca}</span>
      {isTransferido ? (
        <CornerDownRight aria-hidden className="size-5 shrink-0 text-grafite" />
      ) : isSelecionavel ? (
        <Checkbox
          checked={isSelecionado}
          onCheckedChange={() => alternar(item.id)}
          aria-label={`Selecionar ${item.titulo}`}
          className="size-5 rounded-full border-2 border-caneta data-[state=checked]:bg-caneta"
        />
      ) : (
        <Checkbox
          checked={isConcluido}
          onCheckedChange={(marcada) => void definirConclusaoItem(item.id, marcada === true)}
          aria-label={isConcluido ? `Desmarcar ${item.titulo}` : `Concluir ${item.titulo}`}
          className="size-5 rounded-[4px] border-[1.5px] border-tinta/45 bg-papel data-[state=checked]:border-caneta data-[state=checked]:bg-caneta"
        />
      )}
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 py-1.5 pl-1">
        {isTransferido ? (
          <span className="min-w-0 break-words text-grafite">{item.titulo}</span>
        ) : (
          <TituloEditavel
            titulo={item.titulo}
            isEditando={isEditando}
            onIniciarEdicao={() => setIsEditando(true)}
            onSalvar={handleSalvarTitulo}
            onCancelar={() => setIsEditando(false)}
            className={cn(isConcluido && 'text-grafite line-through decoration-tinta/50')}
          />
        )}
        {isEmAndamento && !isEditando && <IndicadorAndamento />}
        {!isEditando && <IndicadorNotas vinculo={vinculoDoItem(item)} titulo={item.titulo} />}
        {isAtrasado && !isEditando && (
          <span className={SELO_DE_ATRASO}>pendente desde {diaCurto(item.dataOriginal)}</span>
        )}
        {isTransferido &&
          (dataDestino ? (
            <Link
              to={`/dia/${dataDestino}`}
              className="rounded-sm text-sm whitespace-nowrap text-violeta-profundo underline decoration-violeta-profundo/30 underline-offset-2 hover:text-caneta hover:decoration-caneta focus-visible:outline-2 focus-visible:outline-caneta"
            >
              transferido para {diaCurto(dataDestino)}
            </Link>
          ) : (
            <span className="text-sm whitespace-nowrap text-grafite">transferido</span>
          ))}
      </div>
      {!isSelecionavel && (
        <MenuItemGrupo item={item} data={data} hoje={hoje} onRenomear={() => setIsEditando(true)} />
      )}
    </div>
  )
}
