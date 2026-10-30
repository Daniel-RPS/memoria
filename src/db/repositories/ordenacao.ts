import { ordemEntre } from '@/lib/tarefas'

/** O que a ordenação precisa de uma tabela Dexie (tarefas, subtarefas...). */
interface TabelaOrdenavel {
  bulkGet(ids: string[]): Promise<({ id: string; ordem: number } | undefined)[]>
  update(id: string, mudancas: { ordem: number; atualizadoEm: string }): Promise<number>
}

export function agora() {
  return new Date().toISOString()
}

/**
 * Grava a nova posição de `idMovido` dentro de `idsEmOrdem` (lista já reordenada).
 * Só o item movido é alterado; se não houver espaço entre os vizinhos, renumera a lista.
 * Deve rodar dentro de uma transação que inclua `tabela`.
 */
export async function gravarNovaPosicao(
  tabela: TabelaOrdenavel,
  idsEmOrdem: string[],
  idMovido: string,
) {
  const itens = await tabela.bulkGet(idsEmOrdem)
  const ordemPorId = new Map(itens.map((item) => [item?.id, item?.ordem]))
  const posicao = idsEmOrdem.indexOf(idMovido)
  const anterior = ordemPorId.get(idsEmOrdem[posicao - 1])
  const posterior = ordemPorId.get(idsEmOrdem[posicao + 1])
  const momento = agora()

  const novaOrdem = ordemEntre(anterior, posterior)
  if (novaOrdem !== null) {
    await tabela.update(idMovido, { ordem: novaOrdem, atualizadoEm: momento })
    return
  }

  await Promise.all(
    idsEmOrdem.map((id, indice) => tabela.update(id, { ordem: indice + 1, atualizadoEm: momento })),
  )
}
