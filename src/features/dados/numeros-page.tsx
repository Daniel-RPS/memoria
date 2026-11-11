import { CabecalhoPagina } from '@/components/cabecalho-pagina'
import { SecaoTarefasPeriodo } from '@/features/dados/components/secao-tarefas-periodo'

/** Dados › Números: o que foi feito e o que ficou pendente no período. */
export function NumerosPage() {
  return (
    <div className="grid gap-8">
      <CabecalhoPagina titulo="Dados" descricao="O que foi feito e o que ficou pendente" />
      <SecaoTarefasPeriodo />
    </div>
  )
}
