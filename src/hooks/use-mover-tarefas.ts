import { toast } from 'sonner'
import {
  adiarSelecao,
  desfazerAcao,
  moverSelecao,
  trazerPendenciasDeOntem,
  type ResultadoAcao,
} from '@/db/repositories/group-repository'
import type { DataLocal } from '@/db/types'
import { useHoje } from '@/hooks/use-hoje'
import { somarDias } from '@/lib/datas'
import { textoAcao } from '@/lib/mover'

/** Tempo do aviso com "Desfazer": o padrão (4 s) é curto para perceber um engano. */
const DURACAO_AVISO_MS = 8000

/** Cards inteiros e itens avulsos de grupo: são copiados, não movidos. */
export interface DeGrupos {
  grupos?: string[]
  itens?: string[]
}

/**
 * Ações de mover com aviso e "Desfazer": tarefas soltas mudam de dia; itens pendentes de
 * grupo são copiados para o card da mesma série no destino (o original fica como transferido).
 */
export function useMoverTarefas() {
  const hoje = useHoje()

  function avisar(resultado: ResultadoAcao, mensagem: string) {
    if (resultado.tarefasMovidas === 0 && resultado.itensCopiados === 0) return resultado
    toast(mensagem, {
      duration: DURACAO_AVISO_MS,
      action: { label: 'Desfazer', onClick: () => void desfazerAcao(resultado) },
    })
    return resultado
  }

  async function mover(ids: string[], destino: DataLocal, deGrupos: DeGrupos = {}) {
    const resultado = await moverSelecao({ tarefas: ids, ...deGrupos }, destino)
    return avisar(
      resultado,
      textoAcao(resultado.tarefasMovidas, resultado.itensCopiados, destino, hoje),
    )
  }

  async function adiar(ids: string[], deGrupos: DeGrupos = {}) {
    const resultado = await adiarSelecao({ tarefas: ids, ...deGrupos }, hoje)
    const { tarefasMovidas, itensCopiados } = resultado
    const partes = []
    if (tarefasMovidas > 0) {
      partes.push(tarefasMovidas === 1 ? '1 tarefa adiada' : `${tarefasMovidas} tarefas adiadas`)
    }
    if (itensCopiados > 0) {
      partes.push(itensCopiados === 1 ? '1 item copiado' : `${itensCopiados} itens copiados`)
    }
    const sufixo = itensCopiados > 0 ? 'para o dia seguinte' : 'um dia'
    return avisar(resultado, `${partes.join(' e ')} ${sufixo}`)
  }

  async function trazerDeOntem() {
    const resultado = await trazerPendenciasDeOntem(hoje)
    return avisar(
      resultado,
      textoAcao(resultado.tarefasMovidas, resultado.itensCopiados, hoje, hoje),
    )
  }

  return { hoje, amanha: somarDias(hoje, 1), mover, adiar, trazerDeOntem }
}
