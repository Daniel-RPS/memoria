import {
  definirAndamento,
  quantidadeAlterada,
  restaurarAndamento,
  type AlvosDeAndamento,
} from '@/db/repositories/andamento-repository'
import { avisarComDesfazer } from '@/hooks/use-mover-tarefas'
import { textoDoAndamento } from '@/lib/andamento'

/**
 * Marcar e parar o "em andamento" com aviso e "Desfazer" (o Ctrl+Z também aciona). A regra de
 * quem pode ser marcado e de quando a marca sai sozinha está em `lib/andamento`.
 */
export function useAndamento() {
  async function aplicar(alvos: AlvosDeAndamento, isMarcar: boolean) {
    const anteriores = await definirAndamento(alvos, isMarcar)
    const quantidade = quantidadeAlterada(anteriores)
    if (quantidade > 0) {
      avisarComDesfazer(textoDoAndamento(quantidade, isMarcar), () =>
        restaurarAndamento(anteriores),
      )
    }
    return quantidade
  }

  return {
    marcarEmAndamento: (alvos: AlvosDeAndamento) => aplicar(alvos, true),
    pararAndamento: (alvos: AlvosDeAndamento) => aplicar(alvos, false),
  }
}
