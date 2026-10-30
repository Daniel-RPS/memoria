import { useNavigate } from 'react-router'
import { criarProcedimento } from '@/db/repositories/procedure-repository'
import { dadosDoFormulario, valoresDoFormulario } from '@/lib/esquema-procedimento'
import { FormularioProcedimento } from '@/features/procedimentos/components/formulario-procedimento'

export function NovoProcedimentoPage() {
  const navigate = useNavigate()

  return (
    <>
      <h1 className="text-4xl font-extrabold tracking-[-0.02em] [font-stretch:80%]">
        Novo procedimento
      </h1>
      <FormularioProcedimento
        valoresIniciais={valoresDoFormulario()}
        rotuloSalvar="Criar procedimento"
        voltarPara="/procedimentos"
        onSalvar={async (valores) => {
          const procedimento = await criarProcedimento(dadosDoFormulario(valores))
          navigate(`/procedimentos/${procedimento.id}`)
        }}
      />
    </>
  )
}
