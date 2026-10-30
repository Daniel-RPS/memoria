import { useEffect, useRef, useState } from 'react'

/** Gravação para sozinha depois de 10 minutos, para não ocupar espaço demais por engano. */
const DURACAO_MAXIMA_S = 600
const INTERVALO_RELOGIO_MS = 250

export type EstadoGravador = 'parado' | 'pedindo' | 'gravando'

export function isGravacaoSuportada() {
  return typeof MediaRecorder !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia)
}

/**
 * Grava áudio do microfone. `onConcluir` recebe o arquivo ao parar.
 * O navegador pede permissão ao microfone na primeira vez.
 */
export function useGravadorAudio(onConcluir: (audio: Blob) => void) {
  const [estado, setEstado] = useState<EstadoGravador>('parado')
  const [segundos, setSegundos] = useState(0)
  const [erro, setErro] = useState<string | null>(null)
  const gravadorRef = useRef<MediaRecorder | null>(null)
  const relogioRef = useRef<number | null>(null)
  const isCanceladoRef = useRef(false)

  function pararRelogio() {
    if (relogioRef.current !== null) window.clearInterval(relogioRef.current)
    relogioRef.current = null
  }

  async function iniciar() {
    setErro(null)
    setEstado('pedindo')
    try {
      const fluxo = await navigator.mediaDevices.getUserMedia({ audio: true })
      const gravador = new MediaRecorder(fluxo)
      const pedacos: Blob[] = []
      isCanceladoRef.current = false
      gravador.ondataavailable = (evento) => {
        if (evento.data.size > 0) pedacos.push(evento.data)
      }
      gravador.onstop = () => {
        fluxo.getTracks().forEach((faixa) => faixa.stop())
        pararRelogio()
        setEstado('parado')
        if (!isCanceladoRef.current && pedacos.length > 0) {
          onConcluir(new Blob(pedacos, { type: gravador.mimeType || 'audio/webm' }))
        }
      }
      gravadorRef.current = gravador
      gravador.start()
      const inicio = Date.now()
      setSegundos(0)
      setEstado('gravando')
      relogioRef.current = window.setInterval(() => {
        const decorridos = (Date.now() - inicio) / 1000
        setSegundos(decorridos)
        if (decorridos >= DURACAO_MAXIMA_S) gravador.stop()
      }, INTERVALO_RELOGIO_MS)
    } catch (falha) {
      setEstado('parado')
      setErro(
        falha instanceof DOMException && falha.name === 'NotAllowedError'
          ? 'O navegador não deu acesso ao microfone. Libere o microfone para este site e tente de novo.'
          : 'Não foi possível acessar o microfone.',
      )
    }
  }

  function parar() {
    gravadorRef.current?.stop()
  }

  function cancelar() {
    isCanceladoRef.current = true
    gravadorRef.current?.stop()
  }

  // Ao sair da tela no meio da gravação, descarta e libera o microfone.
  useEffect(
    () => () => {
      isCanceladoRef.current = true
      if (gravadorRef.current?.state === 'recording') gravadorRef.current.stop()
      pararRelogio()
    },
    [],
  )

  return { estado, segundos, erro, iniciar, parar, cancelar }
}
