import { Link, Navigate, useParams } from 'react-router'
import { valoresDoFormulario } from '@/lib/esquema-procedimento'
import { EditarProcedimento } from '@/features/procedimentos/components/editar-procedimento'
import { useProcedimento } from '@/features/procedimentos/hooks/use-procedimentos'

/** Ver e editar: tudo é editável ali mesmo e grava sozinho. */
export function ProcedimentoPage() {
  const { id = '' } = useParams()
  const { procedimento, isCarregando } = useProcedimento(id)

  if (isCarregando) return null
  if (!procedimento) return <Navigate to="/procedimentos" replace />

  return (
    <>
      <Link to="/procedimentos" className="text-sm text-grafite hover:text-tinta">
        Procedimentos
      </Link>
      <h1 className="sr-only">{procedimento.titulo}</h1>
      {/* Os valores iniciais vêm só na abertura; depois o formulário é a fonte. */}
      <EditarProcedimento
        key={procedimento.id}
        id={procedimento.id}
        titulo={procedimento.titulo}
        valoresIniciais={valoresDoFormulario(procedimento)}
      />
    </>
  )
}
