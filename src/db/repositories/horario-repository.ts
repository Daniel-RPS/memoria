import { db } from '@/db/database'
import { agora } from '@/db/repositories/ordenacao'
import { camposDeHorario } from '@/domain/horario'

/** Tarefa solta ou item de grupo que recebe (ou perde) o horário. */
export interface AlvoDeHorario {
  tipo: 'tarefa' | 'item'
  id: string
}

/** Define o horário `HH:mm` (ou o remove, com `undefined`). Devolve o horário de antes. */
export async function definirHorario(
  alvo: AlvoDeHorario,
  horario: string | undefined,
): Promise<string | undefined> {
  const campos = camposDeHorario(horario)
  const tabela = alvo.tipo === 'tarefa' ? db.tasks : db.groupItems
  return db.transaction('rw', tabela, async () => {
    const registro = await tabela.get(alvo.id)
    if (!registro) return undefined
    await tabela.update(alvo.id, { ...campos, atualizadoEm: agora() })
    return registro.horario
  })
}
