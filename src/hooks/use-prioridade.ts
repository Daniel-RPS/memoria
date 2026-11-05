import {
  alternarPrioridade,
  definirPrioridade,
  quantidadeAlteradaPrioridade,
  restaurarPrioridade,
  type AlvosDePrioridade,
  type PrioridadeAnterior,
} from '@/db/repositories/prioridade-repository'
import { textoDaPrioridade } from '@/domain/prioridade'
import { avisarComDesfazer } from '@/hooks/use-mover-tarefas'

/**
 * Marcar e tirar a prioridade com aviso e "Desfazer" (o Ctrl+Z também aciona). Quem pode ter
 * prioridade e quando ela sai sozinha está em `domain/prioridade`.
 */
export function usePrioridade() {
  function avisar(anteriores: PrioridadeAnterior, isMarcar: boolean) {
    const quantidade = quantidadeAlteradaPrioridade(anteriores)
    if (quantidade > 0) {
      avisarComDesfazer(textoDaPrioridade(quantidade, isMarcar), () =>
        restaurarPrioridade(anteriores),
      )
    }
    return quantidade
  }

  return {
    marcarPrioridade: async (alvos: AlvosDePrioridade) =>
      avisar(await definirPrioridade(alvos, true), true),
    tirarPrioridade: async (alvos: AlvosDePrioridade) =>
      avisar(await definirPrioridade(alvos, false), false),
    alternarPrioridade: async (alvos: AlvosDePrioridade) => {
      const { isMarcar, anteriores } = await alternarPrioridade(alvos)
      return avisar(anteriores, isMarcar)
    },
  }
}
