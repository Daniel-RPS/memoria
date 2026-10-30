import { Navigate, useParams } from 'react-router'
import { useCategorias } from '@/hooks/use-categorias'
import { useHoje } from '@/hooks/use-hoje'
import { isDataLocalValida } from '@/lib/datas'
import { CabecalhoDia } from '@/features/dia/components/cabecalho-dia'
import { FiltroCategorias } from '@/features/dia/components/filtro-categorias'
import { FolhaDoDia } from '@/features/dia/components/folha-do-dia'
import { ContextoCategorias } from '@/features/dia/hooks/contexto-categorias'
import { useFiltroCategoria } from '@/features/dia/hooks/use-filtro-categoria'

export function DiaPage() {
  const { data } = useParams()
  const dataHoje = useHoje()
  const { categorias, isCarregando } = useCategorias()
  const { filtro, definirFiltro } = useFiltroCategoria(categorias, isCarregando)

  if (!isDataLocalValida(data)) return <Navigate to={`/dia/${dataHoje}`} replace />

  return (
    <ContextoCategorias.Provider value={categorias}>
      <CabecalhoDia data={data} hoje={dataHoje} />
      <FiltroCategorias filtro={filtro} onMudar={definirFiltro} />
      <FolhaDoDia key={data} data={data} hoje={dataHoje} filtro={filtro} />
    </ContextoCategorias.Provider>
  )
}
