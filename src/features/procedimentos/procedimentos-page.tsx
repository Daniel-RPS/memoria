import { Plus, Search } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CabecalhoPagina } from '@/components/cabecalho-pagina'
import { useCategorias } from '@/hooks/use-categorias'
import { agruparPorCategoria, buscarProcedimentos } from '@/lib/procedimentos'
import { ListaProcedimentos } from '@/features/procedimentos/components/lista-procedimentos'
import { useProcedimentos } from '@/features/procedimentos/hooks/use-procedimentos'

const PARAMETRO_BUSCA = 'q'

export function ProcedimentosPage() {
  const [parametros, setParametros] = useSearchParams()
  const termo = parametros.get(PARAMETRO_BUSCA) ?? ''
  const { procedimentos, isCarregando } = useProcedimentos()
  const { categorias } = useCategorias('procedimento')
  const blocos = agruparPorCategoria(buscarProcedimentos(procedimentos, termo), categorias)

  function handleBuscar(texto: string) {
    setParametros(texto ? { [PARAMETRO_BUSCA]: texto } : {}, { replace: true })
  }

  return (
    <>
      <CabecalhoPagina
        titulo="Procedimentos"
        acao={
          <Button asChild>
            <Link to="/procedimentos/novo">
              <Plus /> Novo procedimento
            </Link>
          </Button>
        }
      />

      <label className="relative mt-8 block">
        <span className="sr-only">Buscar procedimentos</span>
        <Search
          aria-hidden
          className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-grafite"
        />
        <Input
          type="search"
          value={termo}
          onChange={(evento) => handleBuscar(evento.target.value)}
          placeholder="Buscar em títulos e etapas"
          className="h-10 bg-papel pl-9"
        />
      </label>

      <div aria-label="Lista de procedimentos" role="region" className="mt-6">
        {!isCarregando && procedimentos.length === 0 && (
          <Link
            to="/procedimentos/novo"
            className="flex min-h-32 flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-grafite/40 px-4 py-6 text-center transition-colors hover:border-caneta/45 hover:bg-accent/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-caneta motion-reduce:transition-none"
          >
            <span className="flex items-center gap-1.5 font-semibold">
              <Plus aria-hidden className="size-4" /> Criar o primeiro procedimento
            </span>
            <span className="text-sm text-grafite">
              Por exemplo, as etapas de um backup ou de uma renovação de documento.
            </span>
          </Link>
        )}
        {procedimentos.length > 0 && blocos.length === 0 && (
          <p className="px-1 py-4 text-grafite">Nenhum procedimento encontrado.</p>
        )}
        <ListaProcedimentos blocos={blocos} />
      </div>
    </>
  )
}
