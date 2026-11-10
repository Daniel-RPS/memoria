import { definirHorario, type AlvoDeHorario } from '@/db/repositories/horario-repository'
import { avisarComDesfazer } from '@/hooks/use-mover-tarefas'

/** Definir e remover o horário da tarefa/item; remover mostra aviso com "Desfazer". */
export function useHorario() {
  return {
    salvarHorario: (alvo: AlvoDeHorario, horario: string) => definirHorario(alvo, horario),
    removerHorario: async (alvo: AlvoDeHorario) => {
      const anterior = await definirHorario(alvo, undefined)
      if (anterior) {
        avisarComDesfazer('Horário removido', () => definirHorario(alvo, anterior))
      }
    },
  }
}
