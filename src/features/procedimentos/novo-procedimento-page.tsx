import { Link, useLocation, useNavigate } from 'react-router'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { criarProcedimento } from '@/db/repositories/procedure-repository'
import { valoresDoFormulario } from '@/lib/esquema-procedimento'
import { FormularioProcedimento } from '@/features/procedimentos/components/formulario-procedimento'

/** Estado da navegação para "+ Novo procedimento aqui": abre o editor já na categoria. */
export interface EstadoNovoProcedimento {
  categoryId: string
}

const esquemaEstado = z.object({ categoryId: z.string().min(1) })

export function NovoProcedimentoPage() {
  const navigate = useNavigate()
  const estado = esquemaEstado.safeParse(useLocation().state)
  const categoryId = estado.success ? estado.data.categoryId : ''

  return (
    <>
      <Link to="/procedimentos" className="text-sm text-grafite hover:text-tinta">
        Procedimentos
      </Link>
      <h1 className="sr-only">Novo procedimento</h1>
      <FormularioProcedimento
        valoresIniciais={{ ...valoresDoFormulario(), categoryId }}
        onEnviar={async (dados) => {
          const procedimento = await criarProcedimento(dados)
          // Substitui o "novo" no histórico: voltar leva à lista.
          navigate(`/procedimentos/${procedimento.id}`, { replace: true })
        }}
        rodape={
          <div className="flex justify-end gap-2 border-t border-pauta pt-4">
            <Button asChild variant="ghost">
              <Link to="/procedimentos">Cancelar</Link>
            </Button>
            <Button type="submit">Criar procedimento</Button>
          </div>
        }
      />
    </>
  )
}
