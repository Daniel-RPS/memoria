import { useEffect } from 'react'
import { pararAndamentoForaDeHoje } from '@/db/repositories/andamento-repository'
import { useHoje } from '@/hooks/use-hoje'

/**
 * "Em andamento" só vale para hoje: ao abrir o app e quando a meia-noite passa com ele aberto,
 * para o que ficou em andamento num dia que não é mais hoje (sessão fecha às 23:59:59).
 */
export function useViradaDoDia() {
  const dataHoje = useHoje()
  useEffect(() => {
    void pararAndamentoForaDeHoje(dataHoje)
  }, [dataHoje])
}
