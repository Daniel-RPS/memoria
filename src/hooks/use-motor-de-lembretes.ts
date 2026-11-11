import { useEffect, useEffectEvent, useRef } from 'react'
import {
  conferirLembretes,
  type AvisoDisparado,
  type LembreteComAlvo,
} from '@/db/repositories/lembrete-repository'
import { proximoMomento } from '@/domain/lembretes'

/** Intervalo máximo entre duas conferências (também agenda pelo próximo aviso, se antes). */
export const INTERVALO_MAXIMO_MS = 30_000

/**
 * Motor de disparo, só no cliente e enquanto o app estiver aberto: confere os lembretes ao abrir,
 * a cada mudança nos dados (`linhas`), no próximo aviso (no máximo a cada 30 s) e ao voltar o
 * foco/visibilidade da aba. Cada aviso que disparar chega em `onDisparar`.
 */
export function useMotorDeLembretes(
  linhas: LembreteComAlvo[] | undefined,
  onDisparar: (avisos: AvisoDisparado[]) => void,
) {
  const desdeRef = useRef<Date | undefined>(undefined)
  const isRodandoRef = useRef(false)
  const isPendenteRef = useRef(false)
  const temporizadorRef = useRef<number | undefined>(undefined)

  const conferir = useEffectEvent(async () => {
    if (isRodandoRef.current) {
      isPendenteRef.current = true
      return
    }
    isRodandoRef.current = true
    window.clearTimeout(temporizadorRef.current)
    let espera = INTERVALO_MAXIMO_MS
    try {
      const momento = new Date()
      const { disparados, classificacoes } = await conferirLembretes(momento, desdeRef.current)
      desdeRef.current = momento
      if (disparados.length > 0) onDisparar(disparados)
      const proximo = proximoMomento(classificacoes)
      if (proximo) {
        espera = Math.min(INTERVALO_MAXIMO_MS, Math.max(0, proximo.getTime() - Date.now()) + 50)
      }
    } catch {
      // Banco ocupado ou fechado (outra aba importando backup): tenta de novo no próximo ciclo.
    } finally {
      isRodandoRef.current = false
      temporizadorRef.current = window.setTimeout(() => void conferir(), espera)
      if (isPendenteRef.current) {
        isPendenteRef.current = false
        void conferir()
      }
    }
  })

  // Dados mudaram (inclusive a primeira carga): confere de novo.
  useEffect(() => {
    if (linhas !== undefined) void conferir()
  }, [linhas])

  useEffect(() => {
    const handleVoltar = () => {
      if (document.visibilityState === 'visible') void conferir()
    }
    document.addEventListener('visibilitychange', handleVoltar)
    window.addEventListener('focus', handleVoltar)
    return () => {
      document.removeEventListener('visibilitychange', handleVoltar)
      window.removeEventListener('focus', handleVoltar)
      window.clearTimeout(temporizadorRef.current)
    }
  }, [])
}
