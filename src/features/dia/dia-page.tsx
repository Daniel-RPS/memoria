import { Navigate, useParams } from 'react-router'
import { useCategorias } from '@/hooks/use-categorias'
import { useHoje } from '@/hooks/use-hoje'
import { isDataLocalValida } from '@/lib/datas'
import { CabecalhoDia } from '@/features/dia/components/cabecalho-dia'
import { FolhaDoDia } from '@/features/dia/components/folha-do-dia'
import { ContextoCategorias } from '@/hooks/contexto-categorias'

export function DiaPage() {
  const { data } = useParams()
  const dataHoje = useHoje()
  const { categorias } = useCategorias()

  if (!isDataLocalValida(data)) return <Navigate to={`/dia/${dataHoje}`} replace />

  return (
    <ContextoCategorias.Provider value={categorias}>
      {/* A folha: cabeçalho com o número do dia e, abaixo do traço, as linhas pautadas. */}
      <div className="rounded-lg border border-pauta bg-papel px-4 pt-6 pb-8 sm:px-8">
        <CabecalhoDia data={data} hoje={dataHoje} />
        <FolhaDoDia key={data} data={data} hoje={dataHoje} />
      </div>
    </ContextoCategorias.Provider>
  )
}
