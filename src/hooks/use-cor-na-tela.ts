import { useAparencia } from '@/app/use-aparencia'
import { corDeTraco, corNaTela } from '@/lib/cores'

/** Função que dá a cor de categoria para exibir no tema atual (ver `corNaTela`). */
export function useCorNaTela() {
  const { tema } = useAparencia()
  return (cor: string) => corNaTela(cor, tema)
}

/** Função que dá a cor de categoria para faixas e barras no tema atual (ver `corDeTraco`). */
export function useCorDeTraco() {
  const { tema } = useAparencia()
  return (cor: string) => corDeTraco(cor, tema)
}
