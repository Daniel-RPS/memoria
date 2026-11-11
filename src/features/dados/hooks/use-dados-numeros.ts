import { useLiveQuery } from 'dexie-react-hooks'
import { carregarDadosDeNumeros } from '@/db/repositories/numeros-repository'
import { montarRelatorioDeNumeros } from '@/domain/numeros'
import type { PeriodoDeDados } from '@/domain/tempo'
import { useHoje } from '@/hooks/use-hoje'

/** Números do período, reativos (também entre abas) a qualquer mudança em tarefas e grupos. */
export function useRelatorioDeNumeros(periodo: PeriodoDeDados) {
  const hoje = useHoje()
  const dados = useLiveQuery(carregarDadosDeNumeros, [])
  if (!dados) return { hoje, relatorio: undefined }
  return { hoje, relatorio: montarRelatorioDeNumeros(dados, periodo, hoje) }
}
