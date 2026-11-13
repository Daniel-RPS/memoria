import { useLiveQuery } from 'dexie-react-hooks'
import {
  carregarDadosVisaoGeral,
  montarRelatorioVisaoGeral,
} from '@/domain/visaoGeral'
import { resolverDiasDoPeriodo, type PeriodoDeDados } from '@/domain/periodo'
import { useHoje } from '@/hooks/use-hoje'

export { usePeriodoDeDados as usePeriodoVisaoGeral } from '@/features/dados/hooks/use-dados-tempo'

/** Dados reativos da tela Visão Geral. */
export function useRelatorioVisaoGeral(periodo: PeriodoDeDados) {
  const hoje = useHoje()
  const dados = useLiveQuery(carregarDadosVisaoGeral, [])

  if (!dados) {
    return {
      hoje,
      relatorio: undefined,
      diasDoPeriodo: resolverDiasDoPeriodo(periodo, hoje),
    }
  }

  const diasDoPeriodo = resolverDiasDoPeriodo(periodo, hoje)
  const relatorio = montarRelatorioVisaoGeral(
    dados.dadosNumeros,
    dados.sessoes,
    periodo,
    hoje,
  )

  return {
    hoje,
    relatorio,
    diasDoPeriodo,
  }
}
