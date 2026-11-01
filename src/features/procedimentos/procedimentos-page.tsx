import { Plus, Search } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCategorias } from '@/hooks/use-categorias'
import { agruparPorCategoria, buscarProcedimentos } from '@/lib/procedimentos'
import { ListaProcedimentos } from '@/features/procedimentos/components/lista-procedimentos'
import { useProcedimentos } from '@/features/procedimentos/hooks/use-procedimentos'

const PARAMETRO_BUSCA = 'q'

export function ProcedimentosPage() {
  const [parametros, setParametros] = useSearchParams()
  const termo = parametros.get(PARAMETRO_BUSCA) ?? ''
  const { procedimentos, isCarregando } = useProcedimentos()
  const { categorias } = useCategorias()
  const blocos = agruparPorCategoria(buscarProcedimentos(procedimentos, termo), categorias)

  function handleBuscar(texto: string) {
    setParametros(texto ? { [PARAMETRO_BUSCA]: texto } : {}, { replace: true })
  }

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-4xl font-extrabold tracking-[-0.02em] [font-stretch:80%]">
          Procedimentos
        </h1>
        <Button asChild>
          <Link to="/procedimentos/novo">
            <Plus /> Novo procedimento
          </Link>
        </Button>
      </div>

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
          <p className="rounded-md border border-pauta bg-papel px-4 py-6 text-grafite">
            Nenhum procedimento ainda. Crie o primeiro com <strong>Novo procedimento</strong>, por
            exemplo as etapas de um backup ou de uma renovação de documento.
          </p>
        )}
        {procedimentos.length > 0 && blocos.length === 0 && (
          <p className="px-1 py-4 text-grafite">Nenhum procedimento com “{termo}”.</p>
        )}
        <ListaProcedimentos blocos={blocos} />
      </div>
    </>
  )
}
