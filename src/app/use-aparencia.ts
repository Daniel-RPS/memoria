import { useCallback, useSyncExternalStore } from 'react'
import { gravarPreferencia, lerPreferencia } from '@/app/preferencia-local'
import {
  lerEscolhaTema,
  lerFundo,
  resolverTema,
  type EscolhaTema,
  type Fundo,
} from '@/lib/aparencia'

// O script do index.html lê a mesma chave antes do React (para abrir sem piscar).
export const CHAVE_TEMA = 'memoria:tema'
export const CHAVE_FUNDO = 'memoria:fundo'
const EVENTO_APARENCIA = 'memoria:aparencia'
const CONSULTA_SISTEMA_ESCURO = '(prefers-color-scheme: dark)'

/** Avisa quando muda nesta aba, em outra aba (evento `storage`) ou no sistema operacional. */
function assinar(avisar: () => void) {
  const consulta = matchMedia(CONSULTA_SISTEMA_ESCURO)
  const handleArmazenamento = (evento: StorageEvent) => {
    if (evento.key === null || evento.key === CHAVE_TEMA || evento.key === CHAVE_FUNDO) avisar()
  }
  window.addEventListener(EVENTO_APARENCIA, avisar)
  window.addEventListener('storage', handleArmazenamento)
  consulta.addEventListener('change', avisar)
  return () => {
    window.removeEventListener(EVENTO_APARENCIA, avisar)
    window.removeEventListener('storage', handleArmazenamento)
    consulta.removeEventListener('change', avisar)
  }
}

/** Texto (comparável por valor) com tudo o que decide a aparência. */
function lerInstantaneo() {
  return [
    lerEscolhaTema(lerPreferencia(CHAVE_TEMA)),
    lerFundo(lerPreferencia(CHAVE_FUNDO)),
    matchMedia(CONSULTA_SISTEMA_ESCURO).matches ? 'escuro' : 'claro',
  ].join('|')
}

function gravar(chave: string, valor: string) {
  gravarPreferencia(chave, valor)
  window.dispatchEvent(new Event(EVENTO_APARENCIA))
}

/** Tema escolhido, tema que vale agora (resolvendo "Sistema") e fundo, lembrados no navegador. */
export function useAparencia() {
  const [escolhaTema, fundo, temaDoSistema] = useSyncExternalStore(assinar, lerInstantaneo).split(
    '|',
  ) as [EscolhaTema, Fundo, string]
  const handleEscolherTema = useCallback((escolha: EscolhaTema) => gravar(CHAVE_TEMA, escolha), [])
  const handleEscolherFundo = useCallback((novo: Fundo) => gravar(CHAVE_FUNDO, novo), [])
  return {
    escolhaTema,
    tema: resolverTema(escolhaTema, temaDoSistema === 'escuro'),
    fundo,
    handleEscolherTema,
    handleEscolherFundo,
  }
}
