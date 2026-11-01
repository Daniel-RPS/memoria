import { ListaOrdenavel } from '@/components/lista-ordenavel'
import { FormularioNovaCategoria } from '@/components/seletor-categoria/formulario-nova-categoria'
import { CabecalhoPagina } from '@/components/cabecalho-pagina'
import { useAcoesCategoria } from '@/hooks/use-acoes-categoria'
import { useCategorias } from '@/hooks/use-categorias'
import { proximaCor } from '@/lib/cores'
import { ItemCategoria } from '@/features/categorias/components/item-categoria'
import { useUsoDasCategorias } from '@/features/categorias/hooks/use-uso-das-categorias'

export function CategoriasPage() {
  const { categorias, isCarregando } = useCategorias()
  const { usoDe } = useUsoDasCategorias()
  const { criarCategoria, reordenarCategoria } = useAcoesCategoria()

  return (
    <>
      <CabecalhoPagina
        titulo="Categorias"
        descricao="A cor de cada categoria marca as tarefas, os grupos e os procedimentos dela. Arraste pela alça ⋮⋮ para mudar a ordem: ela vale em todo o app."
      />

      <section
        aria-label="Criar categoria"
        className="mt-8 max-w-md rounded-md border border-pauta bg-papel p-4"
      >
        <FormularioNovaCategoria
          rotulo="Nova categoria"
          rotuloBotao="Criar categoria"
          corInicial={proximaCor(categorias)}
          onCriar={criarCategoria}
        />
      </section>

      <section
        aria-label="Lista de categorias"
        className="mt-6 rounded-md border border-pauta bg-papel"
      >
        {!isCarregando && categorias.length === 0 && (
          <p className="px-4 py-3 text-grafite">
            Nenhuma categoria ainda. Crie a primeira acima, por exemplo Casa ou Trabalho.
          </p>
        )}
        <ListaOrdenavel
          itens={categorias}
          rotulo="Categorias"
          onReordenar={reordenarCategoria}
          renderItem={(categoria) => (
            <ItemCategoria key={categoria.id} categoria={categoria} uso={usoDe(categoria.id)} />
          )}
        />
      </section>
    </>
  )
}
