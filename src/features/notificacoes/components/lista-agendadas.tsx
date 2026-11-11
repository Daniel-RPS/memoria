import type { AlvoDetalhado } from '@/db/repositories/lembrete-repository'
import type { DataLocal } from '@/db/types'
import { agruparPorDia, type LinhaAgendada } from '@/domain/lembretes'
import { LinhaDaAgendada } from '@/features/notificacoes/components/linha-da-agendada'

interface ListaAgendadasProps {
  agendadas: LinhaAgendada<AlvoDetalhado>[]
  hoje: DataLocal
  agora: Date
}

/** "Agendadas": uma linha por tarefa, agrupadas por dia do evento, pelo próximo aviso. */
export function ListaAgendadas({ agendadas, hoje, agora }: ListaAgendadasProps) {
  const dias = agruparPorDia(agendadas, hoje)
  return (
    <section aria-labelledby="titulo-agendadas" className="flex flex-col gap-4">
      <h2 id="titulo-agendadas" className="text-lg font-bold">
        Agendadas
      </h2>
      {dias.length === 0 ? (
        <p className="text-sm text-grafite">Nenhum aviso por vir.</p>
      ) : (
        dias.map((dia) => (
          <div key={dia.data} className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold tracking-wide text-grafite uppercase">
              {dia.titulo}
            </h3>
            <ul className="flex flex-col gap-2">
              {dia.linhas.map((linha) => (
                <LinhaDaAgendada key={linha.alvo.id} linha={linha} agora={agora} />
              ))}
            </ul>
          </div>
        ))
      )}
    </section>
  )
}
