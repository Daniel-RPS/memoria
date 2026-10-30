import { CampoNovoItem } from '@/components/campo-novo-item'
import { useCategorias } from '@/hooks/use-categorias'
import { useAcoesCategoria } from '@/features/categorias/hooks/use-acoes-categoria'
import { ItemCategoria } from '@/features/categorias/components/item-categoria'

export function CategoriasPage() {
  const { categorias, isCarregando } = useCategorias()
  const { criarCategoria } = useAcoesCategoria()

  return (
    <>
      <h1 className="text-4xl font-extrabold tracking-[-0.02em] [font-stretch:80%]">Categorias</h1>
      <p className="mt-2 max-w-prose text-grafite">
        A cor de cada categoria aparece na faixa à esquerda das tarefas. Subcategorias sem cor
        própria usam um tom da cor da categoria.
      </p>

      <section
        aria-label="Lista de categorias"
        className="mt-8 rounded-md border border-pauta bg-papel"
      >
        {!isCarregando && categorias.length === 0 && (
          <p className="border-b border-pauta px-4 py-3 text-grafite">
            Nenhuma categoria ainda. Escreva o nome da primeira abaixo, por exemplo Casa ou
            Trabalho.
          </p>
        )}
        <ul aria-label="Categorias">
          {categorias.map((categoria) => (
            <ItemCategoria key={categoria.id} categoria={categoria} />
          ))}
        </ul>
        <div className="pl-4">
          <CampoNovoItem rotulo="Nova categoria" onCriar={(nome) => criarCategoria({ nome })} />
        </div>
      </section>
    </>
  )
}
