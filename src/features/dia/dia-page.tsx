import { Navigate, useParams } from 'react-router'
import { useHoje } from '@/hooks/use-hoje'
import { isDataLocalValida } from '@/lib/datas'
import { CabecalhoDia } from '@/features/dia/components/cabecalho-dia'
import { FolhaDoDia } from '@/features/dia/components/folha-do-dia'

export function DiaPage() {
  const { data } = useParams()
  const dataHoje = useHoje()

  if (!isDataLocalValida(data)) return <Navigate to={`/dia/${dataHoje}`} replace />

  return (
    <div className="min-h-dvh bg-nevoa">
      <div className="mx-auto max-w-2xl px-4 pt-6 pb-16 sm:px-8">
        <p className="mb-10 text-sm font-semibold text-grafite">MemorIA</p>
        <CabecalhoDia data={data} hoje={dataHoje} />
        <FolhaDoDia key={data} data={data} hoje={dataHoje} />
      </div>
    </div>
  )
}
