import { useSyncExternalStore } from 'react'
import { indexarMarcas, type MarcaDoIndice } from '@/lib/icones'

/**
 * Índice leve das marcas (`/marcas/indice.json`, servido pelo plugin do Vite), baixado uma vez
 * quando o primeiro ícone de marca aparece ou o seletor abre; fica fora do bundle principal.
 */

interface IndiceCarregado {
  lista: MarcaDoIndice[]
  porSlug: ReadonlyMap<string, MarcaDoIndice>
}

let indice: IndiceCarregado | undefined
let pedido: Promise<void> | undefined
const ouvintes = new Set<() => void>()

function carregar() {
  pedido ??= fetch('/marcas/indice.json')
    .then((resposta) => {
      if (!resposta.ok) throw new Error(`Índice de marcas: ${resposta.status}`)
      return resposta.json() as Promise<MarcaDoIndice[]>
    })
    .then((lista) => {
      indice = { lista, porSlug: indexarMarcas(lista) }
    })
    .catch(() => {
      // Sem o índice (ex.: teste sem servidor), as marcas aparecem como ícone neutro.
      indice = { lista: [], porSlug: new Map() }
    })
    .finally(() => {
      for (const ouvinte of ouvintes) ouvinte()
    })
  return pedido
}

function assinar(ouvinte: () => void) {
  ouvintes.add(ouvinte)
  void carregar()
  return () => ouvintes.delete(ouvinte)
}

/** O índice das marcas; `undefined` enquanto carrega. */
export function useIndiceDeMarcas(isNecessario = true) {
  return useSyncExternalStore(
    isNecessario ? assinar : semAssinar,
    () => (isNecessario ? indice : undefined),
    () => undefined,
  )
}

function semAssinar() {
  return () => {}
}

/** Endereço do desenho de uma marca (servido pelo próprio app). */
export function enderecoDaMarca(slug: string) {
  return `/marcas/${slug}.svg`
}
