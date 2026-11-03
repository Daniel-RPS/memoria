import { Plus, Search } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'
import { BotaoImportar } from '@/components/importar/botao-importar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CabecalhoPagina } from '@/components/cabecalho-pagina'
import { SeletorDeDia } from '@/components/seletor-de-dia'
import { useCategorias } from '@/hooks/use-categorias'
import { useFiltroDeDia } from '@/hooks/use-filtro-de-dia'
import { useHoje } from '@/hooks/use-hoje'
import { ATALHOS_DOS_PROCEDIMENTOS, filtrarPorData } from '@/lib/filtro-de-data'
import { agruparPorCategoria, buscarProcedimentos } from '@/lib/procedimentos'
import { ListaProcedimentos } from '@/features/procedimentos/components/lista-procedimentos'
import { useProcedimentos } from '@/features/procedimentos/hooks/use-procedimentos'

const PARAMETRO_BUSCA = 'q'
const CHAVE_FILTRO_DE_DIA_DOS_PROCEDIMENTOS = 'memoria:procedimentos-dia'

export function ProcedimentosPage() {
  const [parametros, setParametros] = useSearchParams()
  const termo = parametros.get(PARAMETRO_BUSCA) ?? ''
  const { procedimentos, isCarregando } = useProcedimentos()
  const { categorias } = useCategorias('procedimento')
  const hoje = useHoje()
  const { filtro, handleMudar: handleFiltro } = useFiltroDeDia(
    CHAVE_FILTRO_DE_DIA_DOS_PROCEDIMENTOS,
    ATALHOS_DOS_PROCEDIMENTOS,
  )
  const encontrados = filtrarPorData(
    buscarProcedimentos(procedimentos, termo),
    (procedimento) => procedimento.criadoEm,
    filtro,
    hoje,
  )
  const blocos = agruparPorCategoria(encontrados, categorias)
  const isFiltrando = termo !== '' || filtro.tipo !== 'qualquer'

  function handleBuscar(texto: string) {
    setParametros(texto ? { [PARAMETRO_BUSCA]: texto } : {}, { replace: true })
  }

  return (
    <>
      <CabecalhoPagina
        titulo="Procedimentos"
        acao={
          <div className="flex flex-wrap gap-2">
            <BotaoImportar conteudoInicial="procedimento" />
            <Button asChild>
              <Link to="/procedimentos/novo">
                <Plus /> Novo procedimento
              </Link>
            </Button>
          </div>
        }
      />

      <div className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-2">
        <label className="relative block min-w-0 flex-1 basis-64">
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
        <SeletorDeDia
          filtro={filtro}
          onMudar={handleFiltro}
          atalhos={ATALHOS_DOS_PROCEDIMENTOS}
          hoje={hoje}
          prefixo="Criado em"
          rotulo="Filtrar pelo dia da criação"
        />
      </div>

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
        <ListaProcedimentos blocos={blocos} isFiltrando={isFiltrando} />
      </div>
    </>
  )
}
