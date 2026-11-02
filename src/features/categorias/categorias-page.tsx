import { CabecalhoPagina } from '@/components/cabecalho-pagina'
import { SecaoCategorias } from '@/features/categorias/components/secao-categorias'
import { useUsoDasCategorias } from '@/features/categorias/hooks/use-uso-das-categorias'

export function CategoriasPage() {
  const { usoDe } = useUsoDasCategorias()

  return (
    <>
      <CabecalhoPagina
        titulo="Categorias"
        descricao="A cor de cada categoria marca os itens dela. As de Grupos valem no Início e no calendário; as de Procedimentos, só na aba Procedimentos. Arraste pela alça ⋮⋮ para mudar a ordem."
      />

      <div className="mt-8 grid items-start gap-x-8 gap-y-10 lg:grid-cols-2">
        {(['grupo', 'procedimento'] as const).map((tipo) => (
          <SecaoCategorias key={tipo} tipo={tipo} usoDe={usoDe} />
        ))}
      </div>
    </>
  )
}
