import { useEffect, useState } from 'react'
import { addDays, startOfDay } from 'date-fns'
import { hoje } from '@/lib/datas'

/** Data local de hoje; atualiza sozinha na virada da meia-noite. */
export function useHoje() {
  const [dataHoje, setDataHoje] = useState(() => hoje())

  useEffect(() => {
    const agora = new Date()
    const msAteAmanha = startOfDay(addDays(agora, 1)).getTime() - agora.getTime()
    const temporizador = window.setTimeout(() => setDataHoje(hoje()), msAteAmanha + 1000)
    return () => window.clearTimeout(temporizador)
  }, [dataHoje])

  return dataHoje
}
