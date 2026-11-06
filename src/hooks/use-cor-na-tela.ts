import { corDeTraco, corNaTela } from '@/lib/cores'

/*
 * Cor de categoria pronta para os dois temas: `light-dark(claro, escuro)`, que o CSS resolve
 * pelo `color-scheme` de cada tema (src/index.css). Assim a troca de tema não re-renderiza
 * nenhuma linha. Use o valor só em CSS (style, variável CSS), nunca como hex em conta de cor.
 */

function nosDoisTemas(claro: string, escuro: string) {
  return claro === escuro ? claro : `light-dark(${claro}, ${escuro})`
}

/** Cor de categoria para exibir (ver `corNaTela`), nos dois temas. */
export function corNaTelaNosDoisTemas(cor: string) {
  return nosDoisTemas(corNaTela(cor, 'claro'), corNaTela(cor, 'escuro'))
}

/** Cor de categoria para faixas e barras (ver `corDeTraco`), nos dois temas. */
export function corDeTracoNosDoisTemas(cor: string) {
  return nosDoisTemas(corDeTraco(cor, 'claro'), corDeTraco(cor, 'escuro'))
}

/** Função que dá a cor de categoria para exibir; não assina o tema. */
export function useCorNaTela() {
  return corNaTelaNosDoisTemas
}

/** Função que dá a cor de categoria para faixas e barras; não assina o tema. */
export function useCorDeTraco() {
  return corDeTracoNosDoisTemas
}
