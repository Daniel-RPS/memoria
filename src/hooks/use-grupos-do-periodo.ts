import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { listarGruposEntre } from '@/db/repositories/group-repository'
import type { DataLocal } from '@/db/types'
import { montarGrupos, type GrupoDoDia } from '@/lib/grupos'

const NENHUM: GrupoDoDia[] = []

/** Cards de grupo (não arquivados) de `inicio` a `fim`, com itens, atualizados sozinhos. */
export function useGruposDoPeriodo(inicio: DataLocal, fim: DataLocal) {
  const resultado = useLiveQuery(() => listarGruposEntre(inicio, fim), [inicio, fim])
  const grupos = useMemo(
    () => (resultado ? montarGrupos(resultado.cards, resultado.series, resultado.itens) : NENHUM),
    [resultado],
  )
  return { grupos, isCarregando: resultado === undefined }
}
