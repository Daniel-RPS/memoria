import { useAparencia } from '@/app/use-aparencia'
import { corNaTela } from '@/lib/cores'

/** Função que dá a cor de categoria para exibir no tema atual (ver `corNaTela`). */
export function useCorNaTela() {
  const { tema } = useAparencia()
  return (cor: string) => corNaTela(cor, tema)
}
