import { useLiveQuery } from 'dexie-react-hooks'
import { DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { db } from '@/db/database'
import { formatarDuracao, somarTempoDoAlvo } from '@/domain/tempo'

interface RodapeTempoDoMenuProps {
  alvo: { tipo: 'tarefa'; id: string } | { tipo: 'item'; id: string; cadeiaId: string }
}

/**
 * Linha discreta no rodapé do menu ⋯ da tarefa ou do item de grupo mostrando o tempo total
 * acumulado ("Tempo gasto: 1h 20 min"). Some quando o tempo é 0.
 */
export function RodapeTempoDoMenu({ alvo }: RodapeTempoDoMenuProps) {
  const tempoMs = useLiveQuery(
    async () => {
      const [sessoes, itens] = await Promise.all([
        db.sessions.toArray(),
        alvo.tipo === 'item' ? db.groupItems.toArray() : Promise.resolve([]),
      ])
      return somarTempoDoAlvo(sessoes, alvo, itens, new Date().toISOString())
    },
    [alvo.tipo, alvo.id, alvo.tipo === 'item' ? alvo.cadeiaId : ''],
    0,
  )

  if (!tempoMs || tempoMs <= 0) return null

  return (
    <>
      <DropdownMenuSeparator />
      <div data-tempo-gasto="" className="px-2 py-1 text-xs text-grafite tabular-nums select-none">
        Tempo gasto: {formatarDuracao(tempoMs)}
      </div>
    </>
  )
}
