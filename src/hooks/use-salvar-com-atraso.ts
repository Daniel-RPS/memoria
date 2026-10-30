import { useEffect, useRef, useState } from 'react'

/** Espera depois da última tecla antes de gravar. */
const ATRASO_PARA_SALVAR_MS = 400

/**
 * Valor editado localmente (sem esperar o banco a cada tecla) e gravado com atraso.
 * IMPORTANTE: ao sair da tela, grava na hora o que estiver pendente, para não perder
 * as últimas teclas. `salvarAgora` faz o mesmo sob demanda (ex.: antes de concluir).
 */
export function useSalvarComAtraso<T>(inicial: T, salvar: (valor: T) => Promise<unknown>) {
  const [valor, setValor] = useState(inicial)
  const [isPendente, setIsPendente] = useState(false)
  const pendenteRef = useRef<{ valor: T } | null>(null)
  const salvarRef = useRef(salvar)

  // Usa sempre a função mais recente sem reiniciar o temporizador a cada renderização.
  useEffect(() => {
    salvarRef.current = salvar
  })

  function gravarPendente() {
    const pendente = pendenteRef.current
    if (!pendente) return Promise.resolve()
    pendenteRef.current = null
    return salvarRef.current(pendente.valor).then(() => {
      if (!pendenteRef.current) setIsPendente(false)
    })
  }

  useEffect(() => {
    if (!pendenteRef.current) return
    const temporizador = window.setTimeout(() => void gravarPendente(), ATRASO_PARA_SALVAR_MS)
    return () => window.clearTimeout(temporizador)
  }, [valor])

  // Ao desmontar, grava o que ficou pendente.
  useEffect(() => () => void gravarPendente(), [])

  function mudar(novo: T) {
    pendenteRef.current = { valor: novo }
    setIsPendente(true)
    setValor(novo)
  }

  return { valor, mudar, isPendente, salvarAgora: gravarPendente }
}
