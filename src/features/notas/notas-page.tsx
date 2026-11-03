import { Plus, Search } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router'
import { BotaoImportar } from '@/components/importar/botao-importar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CabecalhoPagina } from '@/components/cabecalho-pagina'
import { criarNota } from '@/db/repositories/note-repository'
import { useFiltroDeDia } from '@/hooks/use-filtro-de-dia'
import { useHoje } from '@/hooks/use-hoje'
import { ATALHOS_DAS_NOTAS, filtrarPorData, QUALQUER_DIA } from '@/lib/filtro-de-data'
import { agruparNotas, buscarNotasComDono, filtrarNotas, type FiltroDeTipo } from '@/lib/notas'
import { FiltrosDasNotas } from '@/features/notas/components/filtros-das-notas'
import { ListaDeNotas } from '@/features/notas/components/lista-de-notas'
import { useModoDasNotas, useNotas } from '@/features/notas/hooks/use-notas'
import type { EstadoNotaNova } from '@/features/notas/nota-page'

const PARAMETRO_BUSCA = 'q'
const PARAMETRO_TIPO = 'tipo'
const PARAMETRO_CATEGORIA = 'categoria'
const TIPOS_VALIDOS: FiltroDeTipo[] = ['todas', 'tarefa', 'grupo', 'item', 'avulsa']
const CHAVE_FILTRO_DE_DIA_DAS_NOTAS = 'memoria:notas-dia'

export function NotasPage() {
  const navigate = useNavigate()
  const [parametros, setParametros] = useSearchParams()
  const { notas, anexosPorNota, categorias, isCarregando } = useNotas()
  const { modo, handleEscolher: handleModo } = useModoDasNotas()
  const hoje = useHoje()
  const { filtro: filtroDeDia, handleMudar: handleFiltroDeDia } = useFiltroDeDia(
    CHAVE_FILTRO_DE_DIA_DAS_NOTAS,
    ATALHOS_DAS_NOTAS,
  )

  const termo = parametros.get(PARAMETRO_BUSCA) ?? ''
  const tipoLido = parametros.get(PARAMETRO_TIPO) as FiltroDeTipo | null
  const tipo = tipoLido && TIPOS_VALIDOS.includes(tipoLido) ? tipoLido : 'todas'
  // Categoria do endereço que não existe mais: volta para todas.
  const categoria = categorias.find((opcao) => opcao.id === parametros.get(PARAMETRO_CATEGORIA))

  // Dia = o da última edição (o mesmo do "editada há…").
  const encontradas = buscarNotasComDono(
    filtrarPorData(
      filtrarNotas(notas, { tipo, categoryId: categoria?.id }),
      (item) => item.nota.atualizadoEm,
      filtroDeDia,
      hoje,
    ),
    termo,
  )
  const blocos = agruparNotas(encontradas, modo, categorias, hoje)
  const isFiltrando =
    termo !== '' || tipo !== 'todas' || categoria !== undefined || filtroDeDia.tipo !== 'qualquer'

  function mudarParametro(chave: string, valor: string | undefined) {
    setParametros(
      (atuais) => {
        const novos = new URLSearchParams(atuais)
        if (valor) novos.set(chave, valor)
        else novos.delete(chave)
        return novos
      },
      { replace: true },
    )
  }

  async function handleNova() {
    const nota = await criarNota()
    navigate(`/notas/${nota.id}`, { state: { isNova: true } satisfies EstadoNotaNova })
  }

  return (
    <>
      <CabecalhoPagina
        titulo="Notas"
        descricao="Texto livre com fotos, desenhos, áudios e links, solto ou ligado a uma tarefa, grupo ou item. Salva sozinha enquanto você escreve."
        acao={
          <div className="flex flex-wrap gap-2">
            <BotaoImportar conteudoInicial="nota" />
            <Button onClick={() => void handleNova()}>
              <Plus /> Nova nota
            </Button>
          </div>
        }
      />

      {notas.length > 0 && (
        <div className="mt-6 flex flex-col gap-3">
          <label className="relative block">
            <span className="sr-only">Buscar notas</span>
            <Search
              aria-hidden
              className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-grafite"
            />
            <Input
              type="search"
              value={termo}
              onChange={(evento) => mudarParametro(PARAMETRO_BUSCA, evento.target.value)}
              placeholder="Buscar no título, no texto e em tarefas, grupos e categorias"
              className="h-10 bg-papel pl-9"
            />
          </label>
          <FiltrosDasNotas
            modo={modo}
            onModo={handleModo}
            tipo={tipo}
            onTipo={(novo) => mudarParametro(PARAMETRO_TIPO, novo === 'todas' ? undefined : novo)}
            categoria={categoria}
            hasCategorias={categorias.length > 0}
            onCategoria={(id) => mudarParametro(PARAMETRO_CATEGORIA, id)}
            filtroDeDia={filtroDeDia}
            onFiltroDeDia={handleFiltroDeDia}
            hoje={hoje}
          />
        </div>
      )}

      <section aria-label="Lista de notas" className="mt-6">
        {!isCarregando && notas.length === 0 && (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-3">
            <button
              type="button"
              onClick={() => void handleNova()}
              className="flex min-h-32 flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-pauta text-grafite hover:border-caneta/60 hover:text-caneta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-caneta"
            >
              <Plus aria-hidden className="size-5" />
              Criar a primeira nota
            </button>
            <p className="self-center px-1 text-sm text-grafite">
              Você também pode adicionar notas pelo menu ⋯ de uma tarefa ou grupo.
            </p>
          </div>
        )}
        {notas.length > 0 && encontradas.length === 0 && (
          <p className="px-1 py-4 text-grafite">
            {termo ? `Nenhuma nota com “${termo}”.` : 'Nenhuma nota com esses filtros.'}
            {isFiltrando && (
              <Button
                variant="link"
                className="ml-1 h-auto p-0"
                onClick={() => {
                  setParametros({}, { replace: true })
                  handleFiltroDeDia(QUALQUER_DIA)
                }}
              >
                Limpar filtros
              </Button>
            )}
          </p>
        )}
        <ListaDeNotas
          blocos={blocos}
          anexosPorNota={anexosPorNota}
          escopo={`notas:${modo}`}
          isFiltrando={isFiltrando}
        />
      </section>
    </>
  )
}
