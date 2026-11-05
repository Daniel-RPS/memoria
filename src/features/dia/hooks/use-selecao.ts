import { createContext, useContext, useEffect, useState } from 'react'
import {
  aplicarClique,
  SELECAO_VAZIA,
  type AlvoDeClique,
  type EstadoDaSelecao,
  type TipoDeSelecao,
} from '@/domain/selecao-em-lote'
import { isCampoDeTexto } from '@/lib/teclado'

export interface Selecao {
  /** Modo "Selecionar": as caixas viram caixas de seleção. Sem ele também dá para selecionar. */
  isSelecionando: boolean
  selecionados: Set<string>
  /** Linhas (tarefas soltas e itens) ou subetapas de uma só tarefa/item. */
  tipo: TipoDeSelecao
  donoDasSubetapas: string | undefined
  /** Há algo selecionado (a barra de ações aparece, com ou sem o modo). */
  temSelecao: boolean
  iniciar: () => void
  encerrar: () => void
  alternar: (id: string) => void
  selecionarTodos: (ids: string[]) => void
  /** Troca a seleção por esta (linhas). */
  substituir: (ids: string[]) => void
}

/** Linha selecionável: tarefa solta ou item pendente, `tarefa:<id>` / `item:<id>`. */
export const SELETOR_DE_LINHA = '[data-alvo-prioridade]'
/** Linha de subetapa selecionável; o dono vem em `data-dono-subetapa`. */
export const SELETOR_DE_SUBETAPA = '[data-alvo-subetapa]'

/** Onde clicar com modificador NÃO seleciona: o gesto próprio do elemento vale. */
const ONDE_NAO_SELECIONA = '[role="checkbox"], [aria-haspopup], input, textarea, select'
/** Clicar aqui não conta como "clicar fora": a seleção continua. */
const DENTRO_DA_SELECAO = [
  SELETOR_DE_LINHA,
  SELETOR_DE_SUBETAPA,
  '[role="toolbar"]',
  '[role="menu"]',
  '[role="dialog"]',
  '[role="alertdialog"]',
  '[data-sonner-toaster]',
  '[data-radix-popper-content-wrapper]',
].join(', ')

function isVisivel(elemento: Element) {
  return typeof elemento.checkVisibility === 'function' ? elemento.checkVisibility() : true
}

function alvoDaLinha(elemento: Element): AlvoDeClique | null {
  const subetapa = elemento.closest(SELETOR_DE_SUBETAPA)
  if (subetapa) {
    const id = subetapa.getAttribute('data-alvo-subetapa')
    return id
      ? { id, tipo: 'subetapas', dono: subetapa.getAttribute('data-dono-subetapa') ?? undefined }
      : null
  }
  const linha = elemento.closest(SELETOR_DE_LINHA)
  const valor = linha?.getAttribute('data-alvo-prioridade')
  const id = valor?.slice(valor.indexOf(':') + 1)
  return id ? { id, tipo: 'linhas' } : null
}

/** As linhas e subetapas visíveis, na ordem em que aparecem na tela (para o intervalo do Shift). */
function lerOrdemVisivel(): AlvoDeClique[] {
  const alvos: AlvoDeClique[] = []
  for (const elemento of document.querySelectorAll(`${SELETOR_DE_LINHA}, ${SELETOR_DE_SUBETAPA}`)) {
    if (!isVisivel(elemento)) continue
    const alvo = alvoDaLinha(elemento)
    if (alvo) alvos.push(alvo)
  }
  return alvos
}

/**
 * Estado da seleção do Dia e da Semana: o modo "Selecionar" (caixas) e, sem ele, Shift+clique
 * (intervalo) e Ctrl+clique (põe/tira) na linha; Esc ou clique fora limpa. A caixa de concluir
 * continua só concluindo. Subetapas se selecionam do mesmo jeito, só da mesma tarefa/item, e não
 * se misturam com linhas (a seleção anterior é trocada).
 */
export function useSelecao(): Selecao {
  const [isSelecionando, setIsSelecionando] = useState(false)
  const [estado, setEstado] = useState<EstadoDaSelecao>(SELECAO_VAZIA)
  const temSelecao = estado.ids.size > 0

  function limpar() {
    setIsSelecionando(false)
    setEstado(SELECAO_VAZIA)
  }

  // Esc limpa (e sai do modo). Num campo de texto o Esc é do campo (cancela a edição).
  useEffect(() => {
    if (!isSelecionando && !temSelecao) return
    function handleKeyDown(evento: KeyboardEvent) {
      if (evento.key !== 'Escape' || isCampoDeTexto(evento.target)) return
      if (document.querySelector('[role="dialog"], [role="alertdialog"], [role="menu"]')) return
      setIsSelecionando(false)
      setEstado(SELECAO_VAZIA)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isSelecionando, temSelecao])

  // Clique fora (fora das linhas, da barra, de menus e avisos) limpa; no modo, não.
  useEffect(() => {
    if (isSelecionando || !temSelecao) return
    function handlePointerDown(evento: PointerEvent) {
      const alvo = evento.target
      if (alvo instanceof Element && alvo.closest(DENTRO_DA_SELECAO)) return
      setEstado(SELECAO_VAZIA)
    }
    window.addEventListener('pointerdown', handlePointerDown, true)
    return () => window.removeEventListener('pointerdown', handlePointerDown, true)
  }, [isSelecionando, temSelecao])

  // Shift+clique e Ctrl+clique na linha (ou subetapa) selecionam, sem entrar no modo.
  useEffect(() => {
    function alvoDoGesto(evento: MouseEvent) {
      const isModificador = evento.shiftKey || evento.ctrlKey || evento.metaKey
      const elemento = evento.target
      if (!isModificador || !(elemento instanceof Element)) return null
      if (elemento.closest(ONDE_NAO_SELECIONA)) return null
      return alvoDaLinha(elemento)
    }
    function handleMouseDown(evento: MouseEvent) {
      // Sem isto o Shift+clique também pintaria o texto entre as linhas.
      if (alvoDoGesto(evento)) evento.preventDefault()
    }
    function handleClick(evento: MouseEvent) {
      const alvo = alvoDoGesto(evento)
      if (!alvo) return
      evento.preventDefault()
      evento.stopPropagation()
      const modificadores = { shift: evento.shiftKey, ctrl: evento.ctrlKey || evento.metaKey }
      setEstado((atual) => aplicarClique(atual, alvo, modificadores, lerOrdemVisivel()))
    }
    window.addEventListener('mousedown', handleMouseDown, true)
    window.addEventListener('click', handleClick, true)
    return () => {
      window.removeEventListener('mousedown', handleMouseDown, true)
      window.removeEventListener('click', handleClick, true)
    }
  }, [])

  return {
    isSelecionando,
    selecionados: estado.ids,
    tipo: estado.tipo,
    donoDasSubetapas: estado.dono,
    temSelecao,
    iniciar: () => setIsSelecionando(true),
    encerrar: limpar,
    alternar: (id) =>
      setEstado((atual) => {
        const ids = new Set(atual.tipo === 'linhas' ? atual.ids : [])
        if (ids.has(id)) ids.delete(id)
        else ids.add(id)
        return { ids, tipo: 'linhas', ancora: id }
      }),
    selecionarTodos: (ids) => setEstado({ ids: new Set(ids), tipo: 'linhas', ancora: null }),
    substituir: (ids) =>
      setEstado({ ids: new Set(ids), tipo: 'linhas', ancora: ids.at(-1) ?? null }),
  }
}

const SEM_SELECAO: Selecao = {
  isSelecionando: false,
  selecionados: new Set(),
  tipo: 'linhas',
  donoDasSubetapas: undefined,
  temSelecao: false,
  iniciar: () => {},
  encerrar: () => {},
  alternar: () => {},
  selecionarTodos: () => {},
  substituir: () => {},
}

export const ContextoSelecao = createContext<Selecao>(SEM_SELECAO)

export function useSelecaoDaFolha() {
  return useContext(ContextoSelecao)
}
