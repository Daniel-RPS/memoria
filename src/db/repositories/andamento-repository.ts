import { db } from '@/db/database'
import type { DataLocal, GroupItem, Task, TimeSession } from '@/db/types'
import { alvosForaDeHoje, fimDaSessaoNaVirada } from '@/domain/andamento'
import { agora } from '@/db/repositories/ordenacao'
import { abrirSessoesParaAlvos, fecharSessoesAbertasDe, restaurarSessoes } from '@/domain/tempo'
import {
  camposDeAndamento,
  isEmAndamento,
  podeEstarEmAndamento,
  SEM_ANDAMENTO,
  type CamposDeAndamento,
} from '@/lib/andamento'

/** Tarefas soltas e itens de grupo a marcar (ou desmarcar) como em andamento. */
export interface AlvosDeAndamento {
  tarefas?: string[]
  itens?: string[]
}

/** A marca que cada registro tinha antes: é o que o "Desfazer" devolve. */
export interface AndamentoAnterior {
  tarefas: ({ id: string } & CamposDeAndamento)[]
  itens: ({ id: string } & CamposDeAndamento)[]
  sessoesCriadas?: string[]
  sessoesFechadas?: TimeSession[]
}

function existentes<T>(lista: (T | undefined)[]) {
  return lista.filter((registro): registro is T => registro !== undefined)
}

function anterior({ id, emAndamento, emAndamentoDesde }: Task | GroupItem) {
  return { id, emAndamento, emAndamentoDesde }
}

const TABELAS_DE_ANDAMENTO = [db.tasks, db.groupItems, db.groupCards, db.groupSeries, db.sessions]

/**
 * Marca como em andamento (só o que está pendente) ou tira a marca. Quem já estava como pedido
 * não muda nem entra no resultado. Devolve a marca de antes dos que mudaram.
 */
export async function definirAndamento(
  alvos: AlvosDeAndamento,
  isMarcar: boolean,
  /** Ao parar: fim de cada sessão aberta (a virada do dia fecha às 23:59:59). */
  fimDaSessao?: (sessao: TimeSession) => string,
): Promise<AndamentoAnterior> {
  return db.transaction('rw', TABELAS_DE_ANDAMENTO, async () => {
    const [tarefas, itens] = await Promise.all([
      db.tasks.bulkGet(alvos.tarefas ?? []),
      db.groupItems.bulkGet(alvos.itens ?? []),
    ])
    const momento = agora()
    const campos = isMarcar ? camposDeAndamento(momento) : SEM_ANDAMENTO
    const muda = (registro: Task | GroupItem) =>
      isMarcar
        ? podeEstarEmAndamento(registro) && !isEmAndamento(registro)
        : isEmAndamento(registro)
    const tarefasMudadas = existentes(tarefas).filter(muda)
    const itensMudados = existentes(itens).filter(muda)
    await Promise.all([
      ...tarefasMudadas.map((tarefa) =>
        db.tasks.update(tarefa.id, { ...campos, atualizadoEm: momento }),
      ),
      ...itensMudados.map((item) =>
        db.groupItems.update(item.id, { ...campos, atualizadoEm: momento }),
      ),
    ])
    const sessoesCriadas = isMarcar
      ? (
          await abrirSessoesParaAlvos(
            tarefasMudadas.map((t) => ({ ...t, ...campos })),
            itensMudados.map((i) => ({ ...i, ...campos })),
            momento,
          )
        ).map((s) => s.id)
      : undefined
    const sessoesFechadas = !isMarcar
      ? await fecharSessoesAbertasDe(
          {
            tarefas: tarefasMudadas.map((t) => t.id),
            itens: itensMudados.map((i) => i.id),
            cadeias: itensMudados.map((i) => i.cadeiaId),
          },
          momento,
          fimDaSessao,
        )
      : undefined
    return {
      tarefas: tarefasMudadas.map(anterior),
      itens: itensMudados.map(anterior),
      ...(sessoesCriadas ? { sessoesCriadas } : {}),
      ...(sessoesFechadas ? { sessoesFechadas } : {}),
    }
  })
}

/** Devolve a cada registro a marca que tinha (o "Desfazer" de marcar e de parar). */
export async function restaurarAndamento(anteriores: AndamentoAnterior) {
  const momento = agora()
  await db.transaction('rw', [db.tasks, db.groupItems, db.sessions], async () => {
    await Promise.all([
      ...anteriores.tarefas.map(({ id, ...marca }) =>
        db.tasks.update(id, { ...marca, atualizadoEm: momento }),
      ),
      ...anteriores.itens.map(({ id, ...marca }) =>
        db.groupItems.update(id, { ...marca, atualizadoEm: momento }),
      ),
    ])
    await restaurarSessoes({
      criadas: anteriores.sessoesCriadas,
      fechadas: anteriores.sessoesFechadas,
    })
  })
}

/** Quantos registros o resultado alterou. */
export function quantidadeAlterada(resultado: AndamentoAnterior) {
  return resultado.tarefas.length + resultado.itens.length
}

/**
 * Virada do dia: para o que ficou em andamento num dia que não é mais `hoje` (tarefa pelo próprio
 * dia, item pelo dia do card), pela mesma `definirAndamento`. A sessão do tempo fecha às 23:59:59
 * do dia em que começou (ou agora, se for antes).
 */
export async function pararAndamentoForaDeHoje(hoje: DataLocal) {
  const [tarefas, itens] = await Promise.all([
    db.tasks.filter((tarefa) => tarefa.emAndamento === true).toArray(),
    db.groupItems.filter((item) => item.emAndamento === true).toArray(),
  ])
  if (tarefas.length === 0 && itens.length === 0) return
  const cards = existentes(await db.groupCards.bulkGet([...new Set(itens.map((i) => i.cardId))]))
  const alvos = alvosForaDeHoje(tarefas, itens, cards, hoje)
  if (alvos.tarefas.length === 0 && alvos.itens.length === 0) return
  const momento = agora()
  await definirAndamento(alvos, false, (sessao) => fimDaSessaoNaVirada(sessao.inicio, momento))
}
