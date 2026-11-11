import type { Adiamento, DataLocal } from '@/db/types'

/** Uma tarefa solta que mudou (ou vai mudar) de dia. */
export interface MudancaDeDia {
  tarefaId: string
  deData: DataLocal
  paraData: DataLocal
}

/**
 * Registros de adiamento das mudanças: só as que vão para um dia POSTERIOR (datas `YYYY-MM-DD`
 * comparam como texto). Mudança para o mesmo dia ou para trás não gera registro.
 */
export function registrosDeAdiamento(
  mudancas: MudancaDeDia[],
  momento: string,
  novoId: () => string,
): Adiamento[] {
  return mudancas
    .filter((mudanca) => mudanca.paraData > mudanca.deData)
    .map((mudanca) => ({
      id: novoId(),
      tarefaId: mudanca.tarefaId,
      deData: mudanca.deData,
      paraData: mudanca.paraData,
      em: momento,
    }))
}
