import { useLiveQuery } from 'dexie-react-hooks'
import { PainelAnexos } from '@/components/anexos/painel-anexos'
import { Textarea } from '@/components/ui/textarea'
import { obterNotaDoDono, salvarNotaDoDono } from '@/db/repositories/note-repository'
import type { Task } from '@/db/types'
import { useSalvarComAtraso } from '@/hooks/use-salvar-com-atraso'

interface PainelAnotacaoAnexosProps {
  tarefa: Task
  /** Foca a anotação ao abrir (vindo do menu). */
  isFocando: boolean
}

/** Abaixo da tarefa: um texto livre (anotação) e fotos, desenhos, áudios e links. */
export function PainelAnotacaoAnexos({ tarefa, isFocando }: PainelAnotacaoAnexosProps) {
  const dono = { tipo: 'task' as const, id: tarefa.id }
  const nota = useLiveQuery(async () => (await obterNotaDoDono(dono)) ?? null, [tarefa.id])

  return (
    <div className="flex flex-col gap-3">
      {nota !== undefined && (
        <Anotacao
          taskId={tarefa.id}
          titulo={tarefa.titulo}
          inicial={nota?.conteudo ?? ''}
          isFocando={isFocando}
        />
      )}
      <PainelAnexos dono={dono} descricaoDono={`da tarefa ${tarefa.titulo}`} />
    </div>
  )
}

interface AnotacaoProps {
  taskId: string
  titulo: string
  inicial: string
  isFocando: boolean
}

function Anotacao({ taskId, titulo, inicial, isFocando }: AnotacaoProps) {
  const texto = useSalvarComAtraso(inicial, (valor) =>
    salvarNotaDoDono({ tipo: 'task', id: taskId }, valor),
  )

  return (
    <Textarea
      value={texto.valor}
      onChange={(evento) => texto.mudar(evento.target.value)}
      autoFocus={isFocando}
      aria-label={`Anotação da tarefa ${titulo}`}
      placeholder="Anotação: detalhes, números, contatos…"
      rows={2}
      className="min-h-16 bg-papel text-[0.9375rem]"
    />
  )
}
