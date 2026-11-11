import { CabecalhoPagina } from '@/components/cabecalho-pagina'
import { SecaoTempoTarefas } from '@/features/dados/components/secao-tempo-tarefas'

/** Dados › Tempo: quanto tempo foi gasto nas tarefas em andamento. */
export function TempoPage() {
  return (
    <div className="grid gap-8">
      <CabecalhoPagina titulo="Dados" descricao="Como seu tempo foi usado" />
      <SecaoTempoTarefas />
    </div>
  )
}
