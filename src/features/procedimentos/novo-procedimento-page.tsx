import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { criarProcedimento } from '@/db/repositories/procedure-repository'
import { valoresDoFormulario, type ValoresProcedimento } from '@/lib/esquema-procedimento'
import { FormularioProcedimento } from '@/features/procedimentos/components/formulario-procedimento'
import { lerRascunho, limparRascunho } from '@/lib/rascunhos'
import { useRascunho } from '@/hooks/use-rascunho'

/** Estado da navegação para "+ Novo procedimento aqui": abre o editor já na categoria. */
export interface EstadoNovoProcedimento {
  categoryId: string
}

const CHAVE_RASCUNHO = 'novo-procedimento'

const esquemaEstado = z.object({ categoryId: z.string().min(1) })

const esquemaRascunhoProcedimento = z.object({
  titulo: z.string(),
  categoryId: z.string(),
  etapas: z.array(
    z.object({
      id: z.string(),
      texto: z.string(),
      rotulo: z.string().optional(),
    }),
  ),
})

type RascunhoProcedimento = z.infer<typeof esquemaRascunhoProcedimento>

function isProcedimentoVazio(v: RascunhoProcedimento): boolean {
  const semTitulo = v.titulo.trim() === ''
  const semCategoria = !v.categoryId
  const semEtapas = v.etapas.length === 0 || v.etapas.every((e) => e.texto.trim() === '')
  return semTitulo && semCategoria && semEtapas
}

export function NovoProcedimentoPage() {
  const navigate = useNavigate()
  const estado = esquemaEstado.safeParse(useLocation().state)
  const categoryIdNav = estado.success ? estado.data.categoryId : undefined

  // Restaura rascunho se houver
  const [valoresIniciaisForm] = useState<ValoresProcedimento>(() => {
    const salvo = lerRascunho(CHAVE_RASCUNHO, esquemaRascunhoProcedimento)
    const base = valoresDoFormulario()
    if (!salvo) {
      return { ...base, categoryId: categoryIdNav ?? '' }
    }
    return {
      ...base,
      titulo: salvo.titulo,
      // Se a navegação trouxe categoryId, ela manda sobre o rascunho
      categoryId: categoryIdNav ?? salvo.categoryId,
      etapas: salvo.etapas,
    }
  })

  const [valorAtual, setValorAtual] = useState<RascunhoProcedimento>(() => ({
    titulo: valoresIniciaisForm.titulo,
    categoryId: valoresIniciaisForm.categoryId,
    etapas: valoresIniciaisForm.etapas,
  }))

  const { limpar: descartarRascunho } = useRascunho({
    chave: CHAVE_RASCUNHO,
    valor: valorAtual,
    isVazio: isProcedimentoVazio,
  })

  function handleCancelar() {
    descartarRascunho()
  }

  return (
    <>
      <Link to="/procedimentos" className="text-sm text-grafite hover:text-tinta">
        Procedimentos
      </Link>
      <h1 className="sr-only">Novo procedimento</h1>
      <FormularioProcedimento
        valoresIniciais={valoresIniciaisForm}
        onMudarValores={(valores) => {
          setValorAtual({
            titulo: valores.titulo ?? '',
            categoryId: valores.categoryId ?? '',
            etapas: valores.etapas ?? [],
          })
        }}
        onEnviar={async (dados) => {
          limparRascunho(CHAVE_RASCUNHO)
          const procedimento = await criarProcedimento(dados)
          // Substitui o "novo" no histórico: voltar leva à lista.
          navigate(`/procedimentos/${procedimento.id}`, { replace: true })
        }}
        rodape={
          <div className="flex justify-end gap-2 border-t border-pauta pt-4">
            <Button asChild variant="ghost" onClick={handleCancelar}>
              <Link to="/procedimentos">Cancelar</Link>
            </Button>
            <Button type="submit">Criar procedimento</Button>
          </div>
        }
      />
    </>
  )
}
