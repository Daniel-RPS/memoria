import { useLiveQuery } from 'dexie-react-hooks'
import {
  carregarAlvosParaVincular,
  carregarDadosDosVinculos,
  contarNotasPorVinculo,
  listarNotasDe,
} from '@/db/repositories/note-repository'
import type { Vinculo } from '@/db/types'
import { useHoje } from '@/hooks/use-hoje'
import { alvosParaVincular, donoDaNota, indexarVinculos } from '@/lib/notas'

/** Notas de um alvo, da mais recente para a mais antiga (vazio sem alvo). */
export function useNotasDe(vinculo: Vinculo | undefined) {
  const notas = useLiveQuery(
    async () => (vinculo ? listarNotasDe(vinculo) : []),
    [vinculo?.tipo, vinculo?.id],
  )
  return { notas: notas ?? [], isCarregando: notas === undefined }
}

/** A quem o vínculo pertence agora (caminho, categoria, cor); muda junto com o banco. */
export function useDonoDoVinculo(vinculo: Vinculo | undefined) {
  const hoje = useHoje()
  return useLiveQuery(async () => {
    const dados = await carregarDadosDosVinculos(vinculo ? [{ vinculo }] : [])
    return donoDaNota(vinculo, indexarVinculos(dados, hoje))
  }, [vinculo?.tipo, vinculo?.id, hoje])
}

/** Notas por alvo, para os indicadores (uma consulta só para o app inteiro). */
export function useContagemDeNotas() {
  return useLiveQuery(contarNotasPorVinculo, []) ?? new Map<string, number>()
}

/** Tarefas, grupos e itens que casam com o termo ("Vincular a…"). Só lê com `isAtivo`. */
export function useAlvosParaVincular(termo: string, isAtivo: boolean) {
  const hoje = useHoje()
  const dados = useLiveQuery(
    async () => (isAtivo ? carregarAlvosParaVincular() : undefined),
    [isAtivo],
  )
  return dados ? alvosParaVincular(dados, termo, hoje) : []
}
