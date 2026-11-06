import { FolderKanban, Search } from 'lucide-react'
import { useSearchParams } from 'react-router'
import { CabecalhoPagina } from '@/components/cabecalho-pagina'
import { Input } from '@/components/ui/input'
import { useListaDeGrupos } from '@/hooks/use-lista-de-grupos'
import { textoTotalDeGrupos } from '@/lib/grupos'
import { ListaDeGrupos } from '@/features/grupos/components/lista-de-grupos'

const PARAMETRO_BUSCA = 'q'

/** Quais grupos existem e quantos são, por categoria. Só visualização: a linha abre o Dia. */
export function GruposPage() {
  const [parametros, setParametros] = useSearchParams()
  const termo = parametros.get(PARAMETRO_BUSCA) ?? ''
  const { total, blocos, isCarregando } = useListaDeGrupos(termo)

  function handleBuscar(texto: string) {
    setParametros(texto ? { [PARAMETRO_BUSCA]: texto } : {}, { replace: true })
  }

  return (
    <>
      <CabecalhoPagina
        titulo="Grupos"
        descricao={isCarregando ? undefined : textoTotalDeGrupos(total)}
      />

      {total > 0 && (
        <label className="relative mt-6 block">
          <span className="sr-only">Buscar grupos</span>
          <Search
            aria-hidden
            className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-grafite"
          />
          <Input
            type="search"
            value={termo}
            onChange={(evento) => handleBuscar(evento.target.value)}
            placeholder="Buscar pelo nome do grupo ou da categoria"
            className="h-10 bg-papel pl-9"
          />
        </label>
      )}

      <section aria-label="Lista de grupos" className="mt-6">
        {!isCarregando && total === 0 && (
          <div className="flex flex-col items-center gap-3 px-4 py-16 text-center text-grafite">
            <FolderKanban aria-hidden className="size-14 opacity-40" />
            <p className="max-w-md">
              Nenhum grupo ainda. Crie um com + Novo grupo no Dia ou na Semana, ou pela captura do
              Início.
            </p>
          </div>
        )}
        {total > 0 && blocos.length === 0 && (
          <p className="px-1 py-4 text-grafite">Nenhum grupo com “{termo}”.</p>
        )}
        <ListaDeGrupos blocos={blocos} isFiltrando={termo !== ''} />
      </section>
    </>
  )
}
