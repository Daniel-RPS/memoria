import { useEffect, useEffectEvent, useRef } from 'react'
import { gravarRascunho, limparRascunho } from '@/lib/rascunhos'

const ATRASO_MS = 400

interface OpcoesUseRascunho<T> {
  chave: string
  valor: T
  isVazio: (valor: T) => boolean
}

/**
 * Hook para gerenciar gravação automática de rascunhos.
 * - Grava após ATRASO_MS de inatividade se não estiver vazio.
 * - Se estiver vazio, remove o rascunho anterior imediatamente.
 * - Faz flush imediato ao desmontar e nos eventos pagehide e visibilitychange (hidden).
 * - Retorna função `limpar()` para descartar manualmente.
 */
export function useRascunho<T>({ chave, valor, isVazio }: OpcoesUseRascunho<T>) {
  const chaveRef = useRef(chave)
  const valorRef = useRef(valor)
  const isVazioRef = useRef(isVazio)
  const temporizadorRef = useRef<number | null>(null)

  useEffect(() => {
    chaveRef.current = chave
    valorRef.current = valor
    isVazioRef.current = isVazio
  })

  const gravarImediato = useEffectEvent(() => {
    if (temporizadorRef.current !== null) {
      window.clearTimeout(temporizadorRef.current)
      temporizadorRef.current = null
    }

    const c = chaveRef.current
    const v = valorRef.current
    const vazio = isVazioRef.current(v)

    if (vazio) {
      limparRascunho(c)
    } else {
      gravarRascunho(c, v)
    }
  })

  // Efeito ao mudar o valor: agenda gravação com debounce ou remove na hora se vazio
  useEffect(() => {
    if (temporizadorRef.current !== null) {
      window.clearTimeout(temporizadorRef.current)
      temporizadorRef.current = null
    }

    if (isVazio(valor)) {
      limparRascunho(chave)
      return
    }

    temporizadorRef.current = window.setTimeout(() => {
      temporizadorRef.current = null
      gravarRascunho(chave, valor)
    }, ATRASO_MS)

    return () => {
      if (temporizadorRef.current !== null) {
        window.clearTimeout(temporizadorRef.current)
        temporizadorRef.current = null
      }
    }
  }, [chave, valor, isVazio])

  // Flush imediato nos eventos de saída da página e ao desmontar
  useEffect(() => {
    function onVisibilityChange() {
      if (document.visibilityState === 'hidden') {
        gravarImediato()
      }
    }

    function onPageHide() {
      gravarImediato()
    }

    window.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('pagehide', onPageHide)

    return () => {
      window.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('pagehide', onPageHide)
      gravarImediato()
    }
  }, [])

  function limpar() {
    if (temporizadorRef.current !== null) {
      window.clearTimeout(temporizadorRef.current)
      temporizadorRef.current = null
    }
    limparRascunho(chaveRef.current)
  }

  return { limpar }
}
