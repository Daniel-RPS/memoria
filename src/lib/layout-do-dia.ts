import { z } from 'zod'
import { ORDENS_DO_DIA, type SecaoDoDia } from '@/lib/visao-do-dia'

export const CARTOES_DO_INICIO = ['andamento', 'hoje', 'atrasadas'] as const
export type CartaoDoInicio = (typeof CARTOES_DO_INICIO)[number]

/**
 * O que a pessoa deixou aberto ou fechado no Dia e na Semana, lembrado entre visitas: as seções
 * "Grupos" e "Tarefas soltas" recolhidas e os grupos abertos. Grupo é lembrado pela SÉRIE (o
 * cartão copiado para outro dia herda o estado do original); sem estado salvo, o grupo abre
 * recolhido. Cartões da lateral do Início: vazios = todos expandidos (padrão).
 * Só regras puras: guardar no navegador é do hook `useLayoutDoDia`.
 */
export interface LayoutDoDia {
  secoesRecolhidas: SecaoDoDia[]
  /** Ids das séries abertas; quem não está na lista está recolhido. */
  gruposAbertos: string[]
  /** Cartões recolhidos na coluna lateral do Início ('andamento' | 'hoje' | 'atrasadas'). */
  cartoesRecolhidosNoInicio: CartaoDoInicio[]
}

export const LAYOUT_VAZIO: LayoutDoDia = {
  secoesRecolhidas: [],
  gruposAbertos: [],
  cartoesRecolhidosNoInicio: [],
}

const esquemaLayout = z.object({
  secoesRecolhidas: z.array(z.enum(ORDENS_DO_DIA)).catch([]),
  gruposAbertos: z.array(z.string().min(1)).catch([]),
  cartoesRecolhidosNoInicio: z.array(z.enum(CARTOES_DO_INICIO)).catch([]),
})

/** Lê o texto guardado; vazio, quebrado ou de outra forma volta ao padrão (tudo recolhido no dia, expandido no início). */
export function lerLayoutDoDia(texto: string | null): LayoutDoDia {
  if (!texto) return LAYOUT_VAZIO
  try {
    const lido = esquemaLayout.safeParse(JSON.parse(texto))
    if (!lido.success) return LAYOUT_VAZIO
    return {
      secoesRecolhidas: [...new Set(lido.data.secoesRecolhidas)],
      gruposAbertos: [...new Set(lido.data.gruposAbertos)],
      cartoesRecolhidosNoInicio: [...new Set(lido.data.cartoesRecolhidosNoInicio)],
    }
  } catch {
    return LAYOUT_VAZIO
  }
}

export function serializarLayoutDoDia(layout: LayoutDoDia) {
  return JSON.stringify(layout)
}

export function isSecaoRecolhida(layout: LayoutDoDia, secao: SecaoDoDia) {
  return layout.secoesRecolhidas.includes(secao)
}

export function alternarSecao(layout: LayoutDoDia, secao: SecaoDoDia): LayoutDoDia {
  return {
    ...layout,
    secoesRecolhidas: isSecaoRecolhida(layout, secao)
      ? layout.secoesRecolhidas.filter((outra) => outra !== secao)
      : [...layout.secoesRecolhidas, secao],
  }
}

export function isGrupoAberto(layout: LayoutDoDia, seriesId: string) {
  return layout.gruposAbertos.includes(seriesId)
}

export function isCartaoDoInicioRecolhido(layout: LayoutDoDia, cartao: CartaoDoInicio) {
  return layout.cartoesRecolhidosNoInicio.includes(cartao)
}

export function alternarCartaoDoInicio(layout: LayoutDoDia, cartao: CartaoDoInicio): LayoutDoDia {
  const estaRecolhido = isCartaoDoInicioRecolhido(layout, cartao)
  return {
    ...layout,
    cartoesRecolhidosNoInicio: estaRecolhido
      ? layout.cartoesRecolhidosNoInicio.filter((c) => c !== cartao)
      : [...layout.cartoesRecolhidosNoInicio, cartao],
  }
}

/** Abre ou recolhe as séries; devolve o mesmo objeto se nada mudou. */
export function definirGruposAbertos(
  layout: LayoutDoDia,
  seriesIds: string[],
  isAbrir: boolean,
): LayoutDoDia {
  const alvo = new Set(seriesIds)
  const abertos = new Set(layout.gruposAbertos)
  for (const id of alvo) {
    if (isAbrir) abertos.add(id)
    else abertos.delete(id)
  }
  if (
    abertos.size === layout.gruposAbertos.length &&
    layout.gruposAbertos.every((id) => abertos.has(id))
  ) {
    return layout
  }
  return { ...layout, gruposAbertos: [...abertos] }
}

/**
 * Esquece os grupos que não existem mais (excluídos, ou de um backup restaurado), para o que
 * está guardado não acumular lixo. Devolve o mesmo objeto se não havia nada a esquecer.
 */
export function podarGrupos(layout: LayoutDoDia, seriesExistentes: Iterable<string>): LayoutDoDia {
  const existentes = new Set(seriesExistentes)
  const abertos = layout.gruposAbertos.filter((id) => existentes.has(id))
  return abertos.length === layout.gruposAbertos.length
    ? layout
    : { ...layout, gruposAbertos: abertos }
}
