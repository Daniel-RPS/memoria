import { toast } from 'sonner'
import {
  adiarTarefas,
  moverTarefas,
  restaurarPosicoes,
  trazerPendenciasDeOntem,
  type ResultadoMovimento,
} from '@/db/repositories/task-repository'
import type { DataLocal } from '@/db/types'
import { useHoje } from '@/hooks/use-hoje'
import { somarDias } from '@/lib/datas'
import { textoMovimento } from '@/lib/mover'

/**
 * Ações de mover tarefas entre dias com aviso e "Desfazer".
 * A tarefa some da tela ao ser movida, então o aviso confirma para onde foi.
 */
export function useMoverTarefas() {
  const hoje = useHoje()

  function avisar(resultado: ResultadoMovimento, mensagem: string) {
    if (resultado.quantidade === 0) return resultado
    toast(mensagem, {
      action: {
        label: 'Desfazer',
        onClick: () => void restaurarPosicoes(resultado.anteriores),
      },
    })
    return resultado
  }

  async function mover(ids: string[], destino: DataLocal) {
    const resultado = await moverTarefas(ids, destino)
    return avisar(resultado, textoMovimento(resultado.quantidade, destino, hoje))
  }

  async function adiar(ids: string[]) {
    const resultado = await adiarTarefas(ids, hoje)
    const quantidade = resultado.quantidade
    const mensagem = quantidade === 1 ? '1 tarefa adiada' : `${quantidade} tarefas adiadas`
    return avisar(resultado, `${mensagem} um dia`)
  }

  async function trazerDeOntem() {
    const resultado = await trazerPendenciasDeOntem(hoje)
    return avisar(resultado, textoMovimento(resultado.quantidade, hoje, hoje))
  }

  return { hoje, amanha: somarDias(hoje, 1), mover, adiar, trazerDeOntem }
}
