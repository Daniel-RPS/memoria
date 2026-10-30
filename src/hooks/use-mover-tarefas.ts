import { toast } from 'sonner'
import { adiarTarefasEGrupos, moverTarefasEGrupos } from '@/db/repositories/group-repository'
import {
  restaurarPosicoes,
  trazerPendenciasDeOntem,
  type ResultadoMovimento,
} from '@/db/repositories/task-repository'
import type { DataLocal } from '@/db/types'
import { useHoje } from '@/hooks/use-hoje'
import { somarDias } from '@/lib/datas'
import { nomeDoDia, textoMovimento } from '@/lib/mover'

/** Tempo do aviso com "Desfazer": o padrão (4 s) é curto para perceber um engano. */
const DURACAO_AVISO_MS = 8000

/**
 * Ações de mover tarefas e cards de grupo entre dias com aviso e "Desfazer".
 * O que é movido some da tela, então o aviso confirma para onde foi.
 */
export function useMoverTarefas() {
  const hoje = useHoje()

  function avisar(resultado: ResultadoMovimento, mensagem: string) {
    if (resultado.quantidade === 0 && resultado.gruposVaziosMovidos === 0) return resultado
    toast(mensagem, {
      duration: DURACAO_AVISO_MS,
      action: {
        label: 'Desfazer',
        onClick: () => void restaurarPosicoes(resultado.anteriores, resultado.grupos),
      },
    })
    return resultado
  }

  function mensagemDeMovimento(resultado: ResultadoMovimento, destino: DataLocal) {
    // Card vazio não tem tarefa para contar.
    if (resultado.quantidade === 0) return `Grupo movido para ${nomeDoDia(destino, hoje)}`
    return textoMovimento(resultado.quantidade, destino, hoje)
  }

  /** Move tarefas (soltas ou itens) e, opcionalmente, cards inteiros (só os pendentes vão). */
  async function mover(ids: string[], destino: DataLocal, idsGrupos: string[] = []) {
    const resultado = await moverTarefasEGrupos(ids, idsGrupos, destino)
    return avisar(resultado, mensagemDeMovimento(resultado, destino))
  }

  async function adiar(ids: string[], idsGrupos: string[] = []) {
    const resultado = await adiarTarefasEGrupos(ids, idsGrupos, hoje)
    const quantidade = resultado.quantidade
    if (quantidade === 0) return avisar(resultado, 'Grupo adiado um dia')
    const mensagem = quantidade === 1 ? '1 tarefa adiada' : `${quantidade} tarefas adiadas`
    return avisar(resultado, `${mensagem} um dia`)
  }

  async function trazerDeOntem() {
    const resultado = await trazerPendenciasDeOntem(hoje)
    return avisar(resultado, textoMovimento(resultado.quantidade, hoje, hoje))
  }

  return { hoje, amanha: somarDias(hoje, 1), mover, adiar, trazerDeOntem }
}
