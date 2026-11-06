import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { carregarGruposParaLista } from '@/db/repositories/group-repository'
import { useCategorias } from '@/hooks/use-categorias'
import { useHoje } from '@/hooks/use-hoje'
import { montarListaDeGrupos, type ListaDeGrupos } from '@/lib/grupos'

const VAZIA: ListaDeGrupos = { total: 0, blocos: [] }

/** A aba Grupos (blocos por categoria, com a busca), atualizada sozinha, também com duas abas. */
export function useListaDeGrupos(termo: string) {
  const hoje = useHoje()
  const dados = useLiveQuery(carregarGruposParaLista, [])
  const { categorias, isCarregando: isCarregandoCategorias } = useCategorias('grupo')
  const lista = useMemo(
    () => (dados ? montarListaDeGrupos({ ...dados, categorias }, hoje, termo) : VAZIA),
    [dados, categorias, hoje, termo],
  )
  return { ...lista, isCarregando: dados === undefined || isCarregandoCategorias }
}
