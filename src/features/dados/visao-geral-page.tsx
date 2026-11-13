import { CabecalhoPagina } from '@/components/cabecalho-pagina'
import { SecaoVisaoGeral } from '@/features/dados/components/secao-visao-geral'

/** Dados › Visão geral: resumo de números e tempo. */
export function VisaoGeralPage() {
  return (
    <div className="grid gap-8">
      <CabecalhoPagina titulo="Dados" descricao="Um resumo do que foi feito e do tempo gasto" />
      <SecaoVisaoGeral />
    </div>
  )
}
