/** Tema e fundo do app: só camada visual, guardados no navegador (ver `useAparencia`). */

export const ESCOLHAS_DE_TEMA = ['claro', 'escuro', 'sistema'] as const
export type EscolhaTema = (typeof ESCOLHAS_DE_TEMA)[number]
export type Tema = 'claro' | 'escuro'

export const FUNDOS = ['aurora', 'pontos', 'grade', 'liso'] as const
export type Fundo = (typeof FUNDOS)[number]

export const TEMA_PADRAO: EscolhaTema = 'sistema'
export const FUNDO_PADRAO: Fundo = 'aurora'

/** Valor guardado (ou nada, ou lixo) → escolha válida; o que não reconhece vira o padrão. */
export function lerEscolhaTema(valor: string | null): EscolhaTema {
  return ESCOLHAS_DE_TEMA.find((escolha) => escolha === valor) ?? TEMA_PADRAO
}

export function lerFundo(valor: string | null): Fundo {
  return FUNDOS.find((fundo) => fundo === valor) ?? FUNDO_PADRAO
}

/** "Sistema" segue o sistema operacional; as outras escolhas valem como estão. */
export function resolverTema(escolha: EscolhaTema, isSistemaEscuro: boolean): Tema {
  if (escolha === 'sistema') return isSistemaEscuro ? 'escuro' : 'claro'
  return escolha
}

export function temaOposto(tema: Tema): Tema {
  return tema === 'escuro' ? 'claro' : 'escuro'
}
