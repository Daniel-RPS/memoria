import { CabecalhoPagina } from '@/components/cabecalho-pagina'
import { SecaoTempoTarefas } from '@/features/dados/components/secao-tempo-tarefas'

/**
 * Aba "Dados": reúne seções independentes de análise dos dados do app.
 * A primeira seção mede quanto tempo foi gasto nas tarefas em andamento.
 */
export function DadosPage() {
  return (
    <div className="grid gap-8">
      <CabecalhoPagina titulo="Dados" descricao="Como seu tempo foi usado" />
      <SecaoTempoTarefas />
    </div>
  )
}
