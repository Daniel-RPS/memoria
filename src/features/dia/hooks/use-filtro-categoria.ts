import { useSearchParams } from 'react-router'
import type { CategoriaComSubcategorias, FiltroCategoria } from '@/lib/categorias'

const PARAMETRO_CATEGORIA = 'categoria'
const PARAMETRO_SUBCATEGORIA = 'sub'

/**
 * Filtro por categoria guardado na URL (`?categoria=<id>&sub=<id>`), para sobreviver a
 * recarregar a página e à troca de dia. Ids que não existem mais são ignorados.
 */
export function useFiltroCategoria(categorias: CategoriaComSubcategorias[], isCarregando: boolean) {
  const [parametros, setParametros] = useSearchParams()
  const categoriaId = parametros.get(PARAMETRO_CATEGORIA) ?? undefined
  const subcategoriaId = parametros.get(PARAMETRO_SUBCATEGORIA) ?? undefined

  const categoria = categorias.find((item) => item.id === categoriaId)
  const subcategoria = categoria?.subcategorias.find((item) => item.id === subcategoriaId)

  // Enquanto carrega, confia na URL; depois, só vale o que existe.
  const filtro: FiltroCategoria = isCarregando
    ? { categoriaId, subcategoriaId }
    : { categoriaId: categoria?.id, subcategoriaId: subcategoria?.id }

  function definirFiltro(novo: FiltroCategoria) {
    setParametros(
      (atuais) => {
        const proximos = new URLSearchParams(atuais)
        proximos.delete(PARAMETRO_CATEGORIA)
        proximos.delete(PARAMETRO_SUBCATEGORIA)
        if (novo.categoriaId) proximos.set(PARAMETRO_CATEGORIA, novo.categoriaId)
        if (novo.categoriaId && novo.subcategoriaId) {
          proximos.set(PARAMETRO_SUBCATEGORIA, novo.subcategoriaId)
        }
        return proximos
      },
      { replace: true },
    )
  }

  return { filtro, definirFiltro }
}
