import { useMemo, useState } from 'react'
import { versaoDoBanco } from '@/db/repositories/backup-repository'
import {
  carregarExistentes,
  desfazerImportacao,
  importarRascunho,
  type OpcoesDeGravacao,
} from '@/db/repositories/importacao-repository'
import type { DataLocal } from '@/db/types'
import { avisarComDesfazer } from '@/hooks/use-mover-tarefas'
import { lerBackup, type Backup } from '@/lib/backup'
import {
  lerTabelaCsv,
  montarRascunhoDoCsv,
  sugerirMapeamento,
  type MapeamentoDoCsv,
  type TabelaCsv,
} from '@/lib/importar/csv'
import {
  conferirTamanho,
  detectarOrigem,
  isAceitoPela,
  ORIGENS,
  type OrigemDaImportacao,
} from '@/lib/importar/entrada'
import { lerArquivosDoKeep, type ArquivoDeEntrada } from '@/lib/importar/keep'
import { lerMarkdown, type ConteudoDoTexto } from '@/lib/importar/markdown'
import { lerPartesDoBackup, PARTES_DO_BACKUP, type EscolhaDoBackup } from '@/lib/importar/memoria'
import {
  acharDuplicados,
  contarPlano,
  planejarImportacao,
  textoImportados,
  type AcaoParaDuplicado,
  type Existentes,
} from '@/lib/importar/planejar'
import { juntarRascunhos, rascunhoVazio, type RascunhoDeImportacao } from '@/lib/importar/rascunho'
import { ErroDeZip, lerZip } from '@/lib/importar/zip'

export type EtapaDaImportacao = 'origem' | 'entrada' | 'previa'

export interface OpcoesDaImportacao extends OpcoesDeGravacao {
  data: DataLocal
  acao: AcaoParaDuplicado
}

interface UseImportacaoProps {
  origemInicial?: OrigemDaImportacao
  conteudoInicial?: ConteudoDoTexto
  onConcluir: () => void
}

/** Quantos caracteres do começo do arquivo bastam para saber se é backup do MemorIA. */
const INICIO_PARA_DETECTAR = 200

/**
 * Estado do diálogo de importação, etapa por etapa: origem → texto ou arquivos → prévia →
 * gravar. Ler e montar o rascunho são regras puras (`lib/importar`); gravar e desfazer, do
 * repositório. O componente só desenha.
 */
export function useImportacao({ origemInicial, conteudoInicial, onConcluir }: UseImportacaoProps) {
  const [etapa, setEtapa] = useState<EtapaDaImportacao>(origemInicial ? 'entrada' : 'origem')
  const [origem, setOrigem] = useState<OrigemDaImportacao | null>(origemInicial ?? null)
  const [conteudoDoTexto, setConteudoDoTexto] = useState<ConteudoDoTexto>(
    conteudoInicial ?? 'tarefas',
  )
  const [texto, setTexto] = useState('')
  const [arquivosDeTexto, setArquivosDeTexto] = useState<{ nome: string; texto: string }[]>([])
  const [tabela, setTabela] = useState<TabelaCsv | null>(null)
  const [mapeamento, setMapeamento] = useState<MapeamentoDoCsv | null>(null)
  const [rascunhoDoKeep, setRascunhoDoKeep] = useState<RascunhoDeImportacao | null>(null)
  const [backup, setBackup] = useState<Backup | null>(null)
  const [escolhaDoBackup, setEscolhaDoBackup] = useState<EscolhaDoBackup>({
    partes: [...PARTES_DO_BACKUP],
  })
  const [nomesDosArquivos, setNomesDosArquivos] = useState<string[]>([])
  const [erro, setErro] = useState<string | null>(null)
  const [isLendo, setIsLendo] = useState(false)
  const [isGravando, setIsGravando] = useState(false)
  const [desmarcadas, setDesmarcadas] = useState<ReadonlySet<string>>(new Set())
  const [existentes, setExistentes] = useState<Existentes | null>(null)

  const rascunho = useMemo((): RascunhoDeImportacao => {
    if (origem === 'texto') {
      return juntarRascunhos([
        ...(texto.trim() ? [lerMarkdown(texto, conteudoDoTexto, 'colado')] : []),
        ...arquivosDeTexto.map((arquivo, indice) =>
          lerMarkdown(arquivo.texto, conteudoDoTexto, `arquivo${indice}`),
        ),
      ])
    }
    if (origem === 'csv' && tabela && mapeamento) return montarRascunhoDoCsv(tabela, mapeamento)
    if (origem === 'keep' && rascunhoDoKeep) return rascunhoDoKeep
    if (origem === 'memoria' && backup) return lerPartesDoBackup(backup, escolhaDoBackup)
    return rascunhoVazio()
  }, [
    origem,
    texto,
    conteudoDoTexto,
    arquivosDeTexto,
    tabela,
    mapeamento,
    rascunhoDoKeep,
    backup,
    escolhaDoBackup,
  ])

  function limparEntrada() {
    setTexto('')
    setArquivosDeTexto([])
    setTabela(null)
    setMapeamento(null)
    setRascunhoDoKeep(null)
    setBackup(null)
    setNomesDosArquivos([])
    setDesmarcadas(new Set())
    setErro(null)
  }

  function handleEscolherOrigem(nova: OrigemDaImportacao) {
    if (nova !== origem) limparEntrada()
    setOrigem(nova)
    setEtapa('entrada')
  }

  async function irParaPrevia() {
    setExistentes(await carregarExistentes())
    setEtapa('previa')
  }

  /** Lê os arquivos para a origem dada; tudo certo, vai direto para a prévia. */
  async function lerArquivos(arquivos: File[], origemDosArquivos: OrigemDaImportacao) {
    setErro(null)
    const tamanho = conferirTamanho(arquivos)
    if (tamanho) {
      setErro(tamanho)
      return
    }
    const aceitos = arquivos.filter((arquivo) => isAceitoPela(origemDosArquivos, arquivo.name))
    if (aceitos.length === 0) {
      setErro(`Nenhum arquivo serve para ${ORIGENS[origemDosArquivos].rotulo}.`)
      return
    }
    const usados = ORIGENS[origemDosArquivos].isVarios ? aceitos : aceitos.slice(0, 1)
    setIsLendo(true)
    try {
      if (origemDosArquivos === 'texto') {
        setArquivosDeTexto(
          await Promise.all(
            usados.map(async (arquivo) => ({ nome: arquivo.name, texto: await arquivo.text() })),
          ),
        )
      } else if (origemDosArquivos === 'csv') {
        const lida = lerTabelaCsv(await usados[0].text())
        if (lida.cabecalho.length === 0) throw new Error('O arquivo CSV está vazio.')
        setTabela(lida)
        setMapeamento(sugerirMapeamento(lida.cabecalho))
      } else if (origemDosArquivos === 'keep') {
        const entradas: ArquivoDeEntrada[] = []
        for (const arquivo of usados) {
          if (arquivo.name.toLowerCase().endsWith('.zip'))
            entradas.push(...lerZip(await arquivo.arrayBuffer()))
          else
            entradas.push({
              nome: arquivo.name,
              ler: async () => new Uint8Array(await arquivo.arrayBuffer()),
            })
        }
        setRascunhoDoKeep(await lerArquivosDoKeep(entradas))
      } else {
        const lido = lerBackup(await usados[0].text(), versaoDoBanco())
        if (!lido.isValido) throw new Error(lido.mensagem)
        setBackup(lido.backup)
      }
      setNomesDosArquivos(usados.map((arquivo) => arquivo.name))
      setDesmarcadas(new Set())
      await irParaPrevia()
    } catch (erroAoLer) {
      setErro(
        erroAoLer instanceof ErroDeZip || erroAoLer instanceof Error
          ? erroAoLer.message
          : 'Não foi possível ler o arquivo.',
      )
    } finally {
      setIsLendo(false)
    }
  }

  function handleArquivos(arquivos: File[]) {
    if (origem) void lerArquivos(arquivos, origem)
  }

  /** Arquivos soltos na janela: sem origem escolhida (ou na 1ª etapa), descobre pela extensão. */
  async function handleSoltar(arquivos: File[]) {
    if (arquivos.length === 0) return
    if (origem && etapa !== 'origem') {
      await lerArquivos(arquivos, origem)
      return
    }
    const inicio = await arquivos[0].slice(0, INICIO_PARA_DETECTAR).text()
    const detectada = detectarOrigem([{ nome: arquivos[0].name, inicio }])
    if (!detectada) {
      setErro('Não reconheci esse arquivo. Escolha a origem e tente de novo.')
      return
    }
    if (detectada !== origem) limparEntrada()
    setOrigem(detectada)
    setEtapa('entrada')
    await lerArquivos(arquivos, detectada)
  }

  function handleContinuar() {
    if (origem === 'texto' && !texto.trim() && arquivosDeTexto.length === 0) {
      setErro('Cole um texto ou escolha um arquivo.')
      return
    }
    setErro(null)
    void irParaPrevia()
  }

  function handleVoltar() {
    setErro(null)
    setEtapa(etapa === 'previa' ? 'entrada' : 'origem')
  }

  function handleMarcar(chave: string, isMarcada: boolean) {
    const novas = new Set(desmarcadas)
    if (isMarcada) novas.delete(chave)
    else novas.add(chave)
    setDesmarcadas(novas)
  }

  async function handleImportar(opcoes: OpcoesDaImportacao) {
    const plano = planejarImportacao(rascunho, {
      desmarcadas,
      duplicados: acharDuplicados(rascunho, existentes ?? semExistentes, opcoes.data),
      acao: opcoes.acao,
      dataPadrao: opcoes.data,
    })
    if (contarPlano(plano) === 0) {
      setErro('Nada para importar: marque algum item ou escolha outra opção para os repetidos.')
      return
    }
    setIsGravando(true)
    try {
      const resultado = await importarRascunho(plano, opcoes)
      avisarComDesfazer(textoImportados(resultado.quantidade), () => desfazerImportacao(resultado))
      onConcluir()
    } catch {
      setErro('A importação falhou e nada foi gravado. Tente de novo.')
    } finally {
      setIsGravando(false)
    }
  }

  return {
    etapa,
    origem,
    conteudoDoTexto,
    texto,
    arquivosDeTexto,
    tabela,
    mapeamento,
    backup,
    escolhaDoBackup,
    nomesDosArquivos,
    rascunho,
    existentes: existentes ?? semExistentes,
    desmarcadas,
    erro,
    isLendo,
    isGravando,
    setTexto,
    setConteudoDoTexto,
    setMapeamento,
    setEscolhaDoBackup,
    handleEscolherOrigem,
    handleArquivos,
    handleSoltar,
    handleContinuar,
    handleVoltar,
    handleMarcar,
    handleImportar,
  }
}

const semExistentes: Existentes = { tarefas: [], grupos: [], procedimentos: [], notas: [] }
