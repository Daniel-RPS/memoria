import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { carregarArquivados, contarArquivados } from '@/db/repositories/arquivo-repository'
import { useHoje } from '@/hooks/use-hoje'
import { montarArquivados, type ItemArquivado } from '@/lib/arquivados'

const NENHUM: ItemArquivado[] = []

/** Tudo o que está arquivado, atualizado sozinho (também com duas abas abertas). */
export function useArquivados() {
  const hoje = useHoje()
  const dados = useLiveQuery(carregarArquivados, [])
  const itens = useMemo(() => (dados ? montarArquivados(dados, hoje) : NENHUM), [dados, hoje])
  return { itens, isCarregando: dados === undefined }
}

/** Quantos itens há em Arquivados (contador da barra lateral). */
export function useTotalArquivados() {
  return useLiveQuery(contarArquivados, []) ?? 0
}
