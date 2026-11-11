import { definirHorario, type AlvoDeHorario } from '@/db/repositories/horario-repository'
import { definirAvisos } from '@/db/repositories/lembrete-repository'
import { useLembretesDe } from '@/hooks/contexto-lembretes'

/** Avisos de uma tarefa solta ou item: as antecedências marcadas e como mudá-las. */
export function useAvisosDoAlvo(alvo: AlvoDeHorario) {
  const lembretes = useLembretesDe(alvo.id)
  const antecedencias = lembretes.map((lembrete) => lembrete.antecedenciaMin).sort((a, b) => a - b)
  return {
    lembretes,
    antecedencias,
    mudarAvisos: (novas: number[]) => definirAvisos(alvo, novas),
    definirHorario: (horario: string) => definirHorario(alvo, horario),
  }
}
