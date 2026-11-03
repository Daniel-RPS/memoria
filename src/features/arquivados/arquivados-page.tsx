import { useState } from 'react'
import { Archive, Search } from 'lucide-react'
import { useSearchParams } from 'react-router'
import { gravarPreferencia, lerPreferencia } from '@/app/preferencia-local'
import { CabecalhoPagina } from '@/components/cabecalho-pagina'
import { DialogoEscolherDia } from '@/components/dialogo-escolher-dia'
import { AcoesDasSecoes, SecaoRecolhivel } from '@/components/secao-recolhivel'
import { Input } from '@/components/ui/input'
import type { DestinoDoDesarquivar } from '@/db/repositories/arquivo-repository'
import { useAcoesDeArquivo } from '@/hooks/use-acoes-de-arquivo'
import { useArquivados } from '@/hooks/use-arquivados'
import { useHoje } from '@/hooks/use-hoje'
import { useSecoesRecolhidas } from '@/hooks/use-secoes-recolhidas'
import {
  alvosDosItens,
  buscarArquivados,
  contarPorTipo,
  destinoPadraoDoDesarquivar,
  filtrarPorTipo,
  isFiltroDeTipo,
  NOMES_DOS_TIPOS,
  TIPOS_ARQUIVADOS,
  type FiltroDeTipo,
  type ItemArquivado,
} from '@/lib/arquivados'
import type { AcoesDaLinha } from '@/features/arquivados/components/acoes-da-linha'
import { BarraDeSelecao } from '@/features/arquivados/components/barra-de-selecao'
import {
  DialogoAbrir,
  DialogoExcluir,
} from '@/features/arquivados/components/dialogos-dos-arquivados'
import { FiltroPorTipo } from '@/features/arquivados/components/filtro-por-tipo'
import { ListaPorPeriodo } from '@/features/arquivados/components/lista-por-periodo'
import { ICONES_DOS_TIPOS } from '@/features/arquivados/components/tipos-de-arquivado'

const PARAMETRO_BUSCA = 'q'
export const CHAVE_TIPO_DOS_ARQUIVADOS = 'memoria:arquivados-tipo'

function lerTipoSalvo(): FiltroDeTipo {
  const lido = lerPreferencia(CHAVE_TIPO_DOS_ARQUIVADOS)
  return isFiltroDeTipo(lido) ? lido : 'todos'
}

/** Tudo o que foi arquivado, por tipo, com busca, desarquivar, abrir e excluir de vez. */
export function ArquivadosPage() {
  const hoje = useHoje()
  const [parametros, setParametros] = useSearchParams()
  const termo = parametros.get(PARAMETRO_BUSCA) ?? ''
  const { itens, isCarregando } = useArquivados()
  const { desarquivarComAviso, excluirComAviso } = useAcoesDeArquivo()
  const [tipo, setTipo] = useState<FiltroDeTipo>(lerTipoSalvo)
  const [marcados, setMarcados] = useState<Set<string>>(() => new Set())
  const [aberto, setAberto] = useState<ItemArquivado | null>(null)
  const [paraExcluir, setParaExcluir] = useState<ItemArquivado[] | null>(null)
  const [escolhendoDia, setEscolhendoDia] = useState<ItemArquivado | null>(null)
  const isFiltrando = termo !== ''
  const secoes = useSecoesRecolhidas('arquivados', isFiltrando)

  const encontrados = buscarArquivados(itens, termo)
  const contagem = contarPorTipo(encontrados)
  const visiveis = filtrarPorTipo(encontrados, tipo)
  // Só o que está na tela conta como selecionado (filtro ou busca escondem o resto).
  const selecionados = visiveis.filter((item) => marcados.has(item.chave))
  const chavesSelecionadas = new Set(selecionados.map((item) => item.chave))

  function handleTipo(novo: FiltroDeTipo) {
    setTipo(novo)
    gravarPreferencia(CHAVE_TIPO_DOS_ARQUIVADOS, novo)
  }

  function handleBuscar(texto: string) {
    setParametros(texto ? { [PARAMETRO_BUSCA]: texto } : {}, { replace: true })
  }

  function handleSelecionar(item: ItemArquivado, isSelecionado: boolean) {
    setMarcados((atuais) => {
      const novos = new Set(atuais)
      if (isSelecionado) novos.add(item.chave)
      else novos.delete(item.chave)
      return novos
    })
  }

  async function handleDesarquivar(lista: ItemArquivado[], destino?: DestinoDoDesarquivar) {
    await desarquivarComAviso(
      alvosDosItens(lista),
      lista.map((item) => item.tipo),
      destino,
    )
  }

  async function handleExcluir(lista: ItemArquivado[]) {
    setParaExcluir(null)
    await excluirComAviso(alvosDosItens(lista), lista.length)
  }

  const acoes: AcoesDaLinha = {
    onDesarquivar: (lista, destino) => void handleDesarquivar(lista, destino),
    onEscolherDia: setEscolhendoDia,
    onAbrir: setAberto,
    onExcluir: setParaExcluir,
  }

  const lista = (doTipo: ItemArquivado[]) => (
    <ListaPorPeriodo
      itens={doTipo}
      hoje={hoje}
      selecionados={chavesSelecionadas}
      onSelecionar={handleSelecionar}
      acoes={acoes}
    />
  )
  const blocos = TIPOS_ARQUIVADOS.map((doTipo) => ({
    tipo: doTipo,
    itens: visiveis.filter((item) => item.tipo === doTipo),
  })).filter((bloco) => bloco.itens.length > 0)
  const idsDosBlocos = blocos.map((bloco) => bloco.tipo)

  return (
    <>
      <CabecalhoPagina titulo="Arquivados" descricao="Itens tirados do caminho, sem apagar" />

      {itens.length > 0 && (
        <div className="mt-6 flex flex-col gap-3">
          <label className="relative block">
            <span className="sr-only">Buscar arquivados</span>
            <Search
              aria-hidden
              className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-grafite"
            />
            <Input
              type="search"
              value={termo}
              onChange={(evento) => handleBuscar(evento.target.value)}
              placeholder="Buscar no título, no texto e na categoria"
              className="h-10 bg-papel pl-9"
            />
          </label>
          <FiltroPorTipo valor={tipo} contagem={contagem} onMudar={handleTipo} />
          {selecionados.length > 0 && (
            <BarraDeSelecao
              quantidade={selecionados.length}
              total={visiveis.length}
              onDesarquivar={() =>
                void handleDesarquivar(selecionados, (data) =>
                  destinoPadraoDoDesarquivar(data, hoje),
                )
              }
              onExcluir={() => setParaExcluir(selecionados)}
              onSelecionarTodos={() => setMarcados(new Set(visiveis.map((item) => item.chave)))}
              onLimpar={() => setMarcados(new Set())}
            />
          )}
        </div>
      )}

      <section aria-label="Lista de arquivados" className="mt-6">
        {!isCarregando && itens.length === 0 && (
          <div className="flex flex-col items-center gap-3 px-4 py-16 text-center text-grafite">
            <Archive aria-hidden className="size-14 opacity-40" />
            <p className="max-w-md">
              Nada arquivado. Use Arquivar no menu ⋯ de uma tarefa, grupo, nota ou procedimento.
            </p>
          </div>
        )}
        {itens.length > 0 && visiveis.length === 0 && (
          <p className="px-1 py-4 text-grafite">
            {termo
              ? `Nada arquivado com “${termo}”.`
              : `Nenhum ${NOMES_DOS_TIPOS[tipo === 'todos' ? 'tarefa' : tipo].singular.toLowerCase()} arquivado.`}
          </p>
        )}
        {visiveis.length > 0 && tipo !== 'todos' && lista(visiveis)}
        {visiveis.length > 0 && tipo === 'todos' && (
          <div className="flex flex-col gap-6">
            <AcoesDasSecoes
              isTudoAberto={idsDosBlocos.every(secoes.isAberta)}
              isTudoRecolhido={!idsDosBlocos.some(secoes.isAberta)}
              onExpandirTudo={() => secoes.handleExpandirTudo(idsDosBlocos)}
              onRecolherTudo={() => secoes.handleRecolherTudo(idsDosBlocos)}
            />
            {blocos.map((bloco) => {
              const Icone = ICONES_DOS_TIPOS[bloco.tipo]
              return (
                <SecaoRecolhivel
                  key={bloco.tipo}
                  titulo={NOMES_DOS_TIPOS[bloco.tipo].plural}
                  icone={<Icone aria-hidden className="size-5 text-grafite" />}
                  contagem={bloco.itens.length}
                  isAberta={secoes.isAberta(bloco.tipo)}
                  onAlternar={() => secoes.handleAlternar(bloco.tipo)}
                >
                  {lista(bloco.itens)}
                </SecaoRecolhivel>
              )
            })}
          </div>
        )}
      </section>

      <DialogoAbrir item={aberto} onFechar={() => setAberto(null)} />
      <DialogoExcluir
        itens={paraExcluir}
        onCancelar={() => setParaExcluir(null)}
        onConfirmar={(lista) => void handleExcluir(lista)}
      />
      <DialogoEscolherDia
        isAberto={escolhendoDia !== null}
        onMudarAberto={(isAberto) => !isAberto && setEscolhendoDia(null)}
        titulo="Desarquivar para outro dia"
        descricao={escolhendoDia?.titulo}
        dataInicial={escolhendoDia?.data ?? hoje}
        hoje={hoje}
        onEscolher={(dia) => escolhendoDia && void handleDesarquivar([escolhendoDia], dia)}
      />
    </>
  )
}
