import { toast } from 'sonner'
import { Navigate, useNavigate, useParams } from 'react-router'
import { salvarProcedimento } from '@/db/repositories/procedure-repository'
import { dadosDoFormulario, valoresDoFormulario } from '@/lib/esquema-procedimento'
import { FormularioProcedimento } from '@/features/procedimentos/components/formulario-procedimento'
import { useProcedimento } from '@/features/procedimentos/hooks/use-procedimentos'

export function EditarProcedimentoPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { procedimento, isCarregando } = useProcedimento(id)

  if (isCarregando) return null
  if (!procedimento) return <Navigate to="/procedimentos" replace />

  return (
    <>
      <p className="text-sm text-grafite">Editando a versão {procedimento.versao}</p>
      <h1 className="text-4xl font-extrabold tracking-[-0.02em] [font-stretch:80%]">
        {procedimento.titulo}
      </h1>
      <p className="mt-2 max-w-prose text-grafite">
        Ao salvar, a versão atual fica guardada no histórico e esta passa a ser a versão{' '}
        {procedimento.versao + 1}.
      </p>
      <FormularioProcedimento
        key={procedimento.versao}
        valoresIniciais={valoresDoFormulario(procedimento)}
        rotuloSalvar="Salvar nova versão"
        voltarPara={`/procedimentos/${id}`}
        onSalvar={async (valores) => {
          const versao = await salvarProcedimento(id, dadosDoFormulario(valores, procedimento))
          toast(`Versão ${versao} salva. A versão ${versao - 1} ficou no histórico.`)
          navigate(`/procedimentos/${id}`)
        }}
      />
    </>
  )
}
