import { Plus, Search } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCategorias } from '@/hooks/use-categorias'
import { classificarTarefa } from '@/lib/categorias'
import { buscarProcedimentos, idsDosPassos } from '@/lib/procedimentos'
import { useProcedimentos } from '@/features/procedimentos/hooks/use-procedimentos'

const PARAMETRO_BUSCA = 'q'

export function ProcedimentosPage() {
  const [parametros, setParametros] = useSearchParams()
  const termo = parametros.get(PARAMETRO_BUSCA) ?? ''
  const { procedimentos, isCarregando } = useProcedimentos()
  const { categorias } = useCategorias()
  const encontrados = buscarProcedimentos(procedimentos, termo)

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
      <p className="mt-2 max-w-prose text-grafite">
        Passo a passo que você repete: execute marcando cada passo, sem alterar o modelo.
      </p>

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
          placeholder="Buscar em títulos, descrições e passos"
          className="h-10 bg-papel pl-9"
        />
      </label>

      <section aria-label="Lista de procedimentos" className="mt-4">
        {!isCarregando && procedimentos.length === 0 && (
          <p className="rounded-md border border-pauta bg-papel px-4 py-6 text-grafite">
            Nenhum procedimento ainda. Crie o primeiro com <strong>Novo procedimento</strong>, por
            exemplo o passo a passo de um backup ou de uma renovação de certificado.
          </p>
        )}
        {procedimentos.length > 0 && encontrados.length === 0 && (
          <p className="px-1 py-4 text-grafite">Nenhum procedimento com “{termo}”.</p>
        )}
        {encontrados.length > 0 && (
          <ul className="rounded-md border border-pauta bg-papel">
            {encontrados.map((procedimento) => {
              const classificacao = classificarTarefa(procedimento, categorias)
              const totalPassos = idsDosPassos(procedimento).length
              return (
                <li
                  key={procedimento.id}
                  className="relative border-b border-pauta last:border-b-0"
                >
                  {classificacao && (
                    <span
                      aria-hidden
                      className="absolute inset-y-1 left-0 w-1 rounded-r-sm"
                      style={{ backgroundColor: classificacao.cor }}
                    />
                  )}
                  <Link
                    to={`/procedimentos/${procedimento.id}`}
                    className="block px-4 py-3 hover:bg-accent/50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-caneta"
                  >
                    <span className="font-semibold">{procedimento.titulo}</span>
                    <span className="mt-0.5 flex flex-wrap gap-x-3 text-sm text-grafite">
                      <span>{totalPassos === 1 ? '1 passo' : `${totalPassos} passos`}</span>
                      {classificacao && <span>{classificacao.rotulo}</span>}
                      <span>versão {procedimento.versao}</span>
                    </span>
                    {procedimento.descricao && (
                      <span className="mt-1 line-clamp-2 block text-[0.9375rem]">
                        {procedimento.descricao}
                      </span>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </>
  )
}
