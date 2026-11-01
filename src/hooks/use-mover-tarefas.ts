import { useEffect } from 'react'
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

/** Cards inteiros e itens avulsos de grupo: os pendentes são levados, o card fica. */
export interface DeGrupos {
  grupos?: string[]
  itens?: string[]
}

/** Última movimentação com aviso na tela: é o que o Ctrl+Z desfaz. */
let ultimaAcao: { resultado: ResultadoAcao; idAviso: string | number } | null = null

/** Desfaz a última movimentação enquanto o aviso dela está na tela. */
export async function desfazerUltimaAcao() {
  if (!ultimaAcao) return false
  const { resultado, idAviso } = ultimaAcao
  ultimaAcao = null
  toast.dismiss(idAviso)
  await desfazerAcao(resultado)
  return true
}

function avisar(resultado: ResultadoAcao, mensagem: string) {
  if (resultado.tarefasMovidas === 0 && resultado.itensLevados === 0) return resultado
  const esquecer = (aviso: { id: string | number }) => {
    if (ultimaAcao?.idAviso === aviso.id) ultimaAcao = null
  }
  const idAviso = toast(mensagem, {
    duration: DURACAO_AVISO_MS,
    action: { label: 'Desfazer', onClick: () => void desfazerUltimaAcao() },
    onAutoClose: esquecer,
    onDismiss: esquecer,
  })
  ultimaAcao = { resultado, idAviso }
  return resultado
}

function isCampoDeTexto(alvo: EventTarget | null) {
  return (
    alvo instanceof HTMLElement &&
    (alvo.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(alvo.tagName))
  )
}

/** Ctrl+Z (ou ⌘Z) desfaz a última movimentação; dentro de um campo, fica o desfazer do texto. */
export function useAtalhoDesfazer() {
  useEffect(() => {
    function handleKeyDown(evento: KeyboardEvent) {
      const isAtalho =
        (evento.ctrlKey || evento.metaKey) && !evento.shiftKey && evento.key.toLowerCase() === 'z'
      if (!isAtalho || !ultimaAcao || isCampoDeTexto(evento.target)) return
      evento.preventDefault()
      void desfazerUltimaAcao()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
}

/**
 * Ações de mover com aviso e "Desfazer": tarefas soltas mudam de dia; itens pendentes de
 * grupo são levados para o card da mesma série no destino (ver `planejarLevarItens`).
 */
export function useMoverTarefas() {
  const hoje = useHoje()

  async function mover(ids: string[], destino: DataLocal, deGrupos: DeGrupos = {}) {
    const resultado = await moverSelecao({ tarefas: ids, ...deGrupos }, destino)
    return avisar(
      resultado,
      textoAcao(resultado.tarefasMovidas, resultado.itensLevados, destino, hoje),
    )
  }

  async function adiar(ids: string[], deGrupos: DeGrupos = {}) {
    const resultado = await adiarSelecao({ tarefas: ids, ...deGrupos }, hoje)
    const { tarefasMovidas, itensLevados } = resultado
    const partes = []
    if (tarefasMovidas > 0) {
      partes.push(tarefasMovidas === 1 ? '1 tarefa adiada' : `${tarefasMovidas} tarefas adiadas`)
    }
    if (itensLevados > 0) {
      partes.push(itensLevados === 1 ? '1 item levado' : `${itensLevados} itens levados`)
    }
    const sufixo = itensLevados > 0 ? 'para o dia seguinte' : 'um dia'
    return avisar(resultado, `${partes.join(' e ')} ${sufixo}`)
  }

  async function trazerDeOntem() {
    const resultado = await trazerPendenciasDeOntem(hoje)
    return avisar(
      resultado,
      textoAcao(resultado.tarefasMovidas, resultado.itensLevados, hoje, hoje),
    )
  }

  return { hoje, amanha: somarDias(hoje, 1), mover, adiar, trazerDeOntem }
}
