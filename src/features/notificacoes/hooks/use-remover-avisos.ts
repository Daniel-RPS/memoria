import {
  definirAvisos,
  removerAvisosDe,
  type AlvoDeLembrete,
} from '@/db/repositories/lembrete-repository'
import { avisarComDesfazer } from '@/hooks/use-mover-tarefas'

/** "Remover avisos" de uma tarefa, com aviso e Desfazer (recria os mesmos avisos). */
export function useRemoverAvisos() {
  return async (alvo: AlvoDeLembrete, antecedencias: number[]) => {
    await removerAvisosDe(alvo.id)
    avisarComDesfazer('Avisos removidos', () => definirAvisos(alvo, antecedencias))
  }
}
