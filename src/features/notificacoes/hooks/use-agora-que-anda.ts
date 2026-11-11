import { useEffect, useState } from 'react'

const INTERVALO_MS = 30_000

/** `new Date()` renovado a cada 30 s (o que já passou sai de "Agendadas" sozinho). */
export function useAgoraQueAnda() {
  const [agora, setAgora] = useState(() => new Date())
  useEffect(() => {
    const intervalo = window.setInterval(() => setAgora(new Date()), INTERVALO_MS)
    return () => window.clearInterval(intervalo)
  }, [])
  return agora
}
