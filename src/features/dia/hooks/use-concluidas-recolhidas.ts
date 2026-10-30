import { useState } from 'react'

const CHAVE = 'memoria:concluidas-recolhidas'

function lerPreferencia() {
  try {
    return window.localStorage.getItem(CHAVE) !== 'false'
  } catch {
    return true
  }
}

/** Se o grupo "Concluídas" está recolhido; começa recolhido e lembra a escolha. */
export function useConcluidasRecolhidas() {
  const [isRecolhido, setIsRecolhido] = useState(lerPreferencia)

  function alternar() {
    setIsRecolhido((atual) => {
      const proximo = !atual
      try {
        window.localStorage.setItem(CHAVE, String(proximo))
      } catch {
        // Sem localStorage a escolha vale só nesta sessão.
      }
      return proximo
    })
  }

  return { isRecolhido, alternar }
}
