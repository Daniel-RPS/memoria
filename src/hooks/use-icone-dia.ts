import { useEffect, useState } from 'react'
import { Moon, Sun, type LucideIcon } from 'lucide-react'
import { msAteProximaVirada, periodoDoDia, type PeriodoDoDia } from '@/domain/periodo-do-dia'

/** Ícone de "Dia": Sol de dia, Lua à noite; troca sozinho na virada e ao voltar para a aba. */
export function useIconeDia(): LucideIcon {
  const [periodo, setPeriodo] = useState<PeriodoDoDia>(() => periodoDoDia(new Date()))

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const reavaliar = () => {
      clearTimeout(timer)
      setPeriodo(periodoDoDia(new Date()))
      timer = setTimeout(reavaliar, msAteProximaVirada(new Date()) + 50)
    }
    const handleVisibilidade = () => {
      if (document.visibilityState === 'visible') reavaliar()
    }
    reavaliar()
    document.addEventListener('visibilitychange', handleVisibilidade)
    window.addEventListener('focus', reavaliar)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', handleVisibilidade)
      window.removeEventListener('focus', reavaliar)
    }
  }, [])

  return periodo === 'dia' ? Sun : Moon
}
