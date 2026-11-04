import { useEffect, useState, useSyncExternalStore } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { gravarPreferencia, lerPreferencia } from '@/app/preferencia-local'
import {
  carregarDadosDeTempo,
  CHAVE_PERIODO_DADOS,
  lerPeriodoDeDados,
  montarRelatorioDeTempo,
  type DadosDeTempo,
  type PeriodoDeDados,
} from '@/domain/tempo'
import { useHoje } from '@/hooks/use-hoje'

const EVENTO_PERIODO = 'memoria:mudou-dados-periodo'

let cacheTexto: string | null | undefined
let cacheValor: PeriodoDeDados = lerPeriodoDeDados(null)

function lerInstantaneo(): PeriodoDeDados {
  const bruto = lerPreferencia(CHAVE_PERIODO_DADOS)
  if (bruto !== cacheTexto) {
    cacheTexto = bruto
    cacheValor = lerPeriodoDeDados(bruto)
  }
  return cacheValor
}

function assinarPeriodo(callback: () => void) {
  const aoMudarStorage = (evento: StorageEvent) => {
    if (evento.key === null || evento.key === CHAVE_PERIODO_DADOS) callback()
  }
  window.addEventListener(EVENTO_PERIODO, callback)
  window.addEventListener('storage', aoMudarStorage)
  return () => {
    window.removeEventListener(EVENTO_PERIODO, callback)
    window.removeEventListener('storage', aoMudarStorage)
  }
}

/** Período selecionado na tela Dados, lembrado no localStorage e sincronizado entre abas. */
export function usePeriodoDeDados() {
  const periodo = useSyncExternalStore(assinarPeriodo, lerInstantaneo, () =>
    lerPeriodoDeDados(null),
  )

  function definirPeriodo(novo: PeriodoDeDados) {
    const serializado = JSON.stringify(novo)
    cacheTexto = serializado
    cacheValor = novo
    gravarPreferencia(CHAVE_PERIODO_DADOS, serializado)
    window.dispatchEvent(new Event(EVENTO_PERIODO))
  }

  return [periodo, definirPeriodo] as const
}

/** Dados reativos da seção "Tempo nas tarefas", atualizados também a cada minuto se houver sessão aberta. */
export function useRelatorioDeTempo(periodo: PeriodoDeDados) {
  const hoje = useHoje()
  const dados = useLiveQuery(carregarDadosDeTempo, [])
  const [agoraIso, setAgoraIso] = useState(() => new Date().toISOString())

  const temSessaoAberta = dados?.sessoes.some((s) => s.fim === undefined) ?? false

  useEffect(() => {
    if (!temSessaoAberta) return
    const id = window.setInterval(() => setAgoraIso(new Date().toISOString()), 60_000)
    return () => window.clearInterval(id)
  }, [temSessaoAberta])

  if (!dados) return { isCarregando: true as const, hoje, dados: undefined, relatorio: undefined }

  const dadosCompletos: DadosDeTempo = dados
  const relatorio = montarRelatorioDeTempo(dadosCompletos, periodo, hoje, agoraIso)
  return {
    isCarregando: false as const,
    hoje,
    dados: dadosCompletos,
    relatorio,
    agoraIso,
  }
}
