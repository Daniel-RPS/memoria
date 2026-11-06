import type { Tema } from '@/lib/aparencia'

/**
 * Leva o tema ao `<html>` (`data-tema`, lido pelos tokens de src/index.css), na hora. É a única
 * escrita que a troca precisa: nenhum componente de lista assina o tema. Sem crossfade (View
 * Transition): medido, ele dobrava o tempo até pintar. Cliques seguidos só regravam o atributo.
 */
export function aplicarTemaNoHtml(tema: Tema) {
  const raiz = document.documentElement
  if (raiz.dataset.tema !== tema) raiz.dataset.tema = tema
}

const pendentes = new Set<() => void>()

function rodarPendentes() {
  for (const tarefa of pendentes) tarefa()
  pendentes.clear()
}

/**
 * Roda fora do caminho crítico da troca (gravar, avisar outras abas). Se a página fechar ou
 * recarregar antes, roda na saída (`pagehide`), para a escolha nunca se perder.
 */
export function depoisDaTroca(tarefa: () => void) {
  if (pendentes.size === 0) window.addEventListener('pagehide', rodarPendentes, { once: true })
  const executar = () => {
    if (!pendentes.delete(executar)) return
    if (pendentes.size === 0) window.removeEventListener('pagehide', rodarPendentes)
    tarefa()
  }
  pendentes.add(executar)
  // Tarefa nova por MessageChannel (como um setTimeout 0, sem o atraso mínimo dos timers).
  const canal = new MessageChannel()
  canal.port1.onmessage = executar
  canal.port2.postMessage(null)
}
