import type { CampoVariavel, Execution, Procedure } from '@/db/types'

/** Minúsculas e sem acentos, para comparar nomes e buscar. */
export function normalizar(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}

/** `{{ nome do campo }}` dentro do texto de um passo. */
const PADRAO_CAMPO = /\{\{\s*([^{}]+?)\s*\}\}/g

export type ParteDoTexto =
  | { tipo: 'texto'; texto: string }
  /** Campo preenchido na execução. */
  | { tipo: 'valor'; texto: string; campo: string }
  /** Campo ainda sem valor: mostra o nome para lembrar de preencher. */
  | { tipo: 'faltando'; texto: string; campo: string }
  /** Credencial: só o local da senha, nunca o valor. */
  | { tipo: 'credencial'; texto: string; campo: string }
  /** `{{algo}}` que não corresponde a nenhum campo. */
  | { tipo: 'desconhecido'; texto: string }

function acharCampo(campos: CampoVariavel[], nome: string) {
  const alvo = normalizar(nome)
  return campos.find((campo) => normalizar(campo.nome) === alvo)
}

export function textoCredencial(campo: CampoVariavel) {
  return `senha em: ${campo.localCredencial?.trim() || 'local não informado'}`
}

/** Quebra o texto em partes, trocando `{{campo}}` pelo valor (ou marcando o que falta). */
export function partesDoTexto(
  texto: string,
  campos: CampoVariavel[],
  valores: Record<string, string>,
): ParteDoTexto[] {
  const partes: ParteDoTexto[] = []
  let ultimo = 0
  for (const encontro of texto.matchAll(PADRAO_CAMPO)) {
    const inicio = encontro.index ?? 0
    if (inicio > ultimo) partes.push({ tipo: 'texto', texto: texto.slice(ultimo, inicio) })
    const campo = acharCampo(campos, encontro[1])
    if (!campo) {
      partes.push({ tipo: 'desconhecido', texto: encontro[0] })
    } else if (campo.tipo === 'credencial') {
      partes.push({ tipo: 'credencial', texto: textoCredencial(campo), campo: campo.nome })
    } else if (valores[campo.id]?.trim()) {
      partes.push({ tipo: 'valor', texto: valores[campo.id], campo: campo.nome })
    } else {
      partes.push({ tipo: 'faltando', texto: `{{${campo.nome}}}`, campo: campo.nome })
    }
    ultimo = inicio + encontro[0].length
  }
  if (ultimo < texto.length) partes.push({ tipo: 'texto', texto: texto.slice(ultimo) })
  return partes
}

/** Texto final com os campos trocados (o que vai para a área de transferência ao copiar). */
export function substituirCampos(
  texto: string,
  campos: CampoVariavel[],
  valores: Record<string, string>,
) {
  return partesDoTexto(texto, campos, valores)
    .map((parte) => (parte.tipo === 'credencial' ? `[${parte.texto}]` : parte.texto))
    .join('')
}

/** Nomes usados como `{{...}}` que não existem entre os campos (para avisar no editor). */
export function camposDesconhecidos(procedimento: Pick<Procedure, 'secoes' | 'camposVariaveis'>) {
  const textos = procedimento.secoes.flatMap((secao) =>
    secao.passos.flatMap((passo) => [
      passo.texto,
      passo.codigo ?? '',
      passo.alerta ?? '',
      ...passo.subpassos.map((subpasso) => subpasso.texto),
    ]),
  )
  const desconhecidos = new Set<string>()
  for (const texto of textos) {
    for (const encontro of texto.matchAll(PADRAO_CAMPO)) {
      if (!acharCampo(procedimento.camposVariaveis, encontro[1])) desconhecidos.add(encontro[1])
    }
  }
  return [...desconhecidos]
}

/** Ids dos passos em ordem (o que se marca ou pula na execução). */
export function idsDosPassos(procedimento: Pick<Procedure, 'secoes'>) {
  return procedimento.secoes.flatMap((secao) => secao.passos.map((passo) => passo.id))
}

export interface ProgressoExecucao {
  feitos: number
  pulados: number
  total: number
}

/** Quantos passos foram feitos e pulados (ignora ids que não existem na versão usada). */
export function progressoExecucao(
  procedimento: Pick<Procedure, 'secoes'>,
  execucao: Pick<Execution, 'passosMarcados' | 'passosPulados'>,
): ProgressoExecucao {
  const ids = new Set(idsDosPassos(procedimento))
  return {
    feitos: execucao.passosMarcados.filter((id) => ids.has(id)).length,
    pulados: execucao.passosPulados.filter((id) => ids.has(id)).length,
    total: ids.size,
  }
}

/** Marca, desmarca ou pula um passo; um passo nunca fica feito e pulado ao mesmo tempo. */
export function definirEstadoDoPasso(
  execucao: Pick<Execution, 'passosMarcados' | 'passosPulados'>,
  passoId: string,
  estado: 'feito' | 'pulado' | 'pendente',
) {
  const marcados = execucao.passosMarcados.filter((id) => id !== passoId)
  const pulados = execucao.passosPulados.filter((id) => id !== passoId)
  if (estado === 'feito') marcados.push(passoId)
  if (estado === 'pulado') pulados.push(passoId)
  return { passosMarcados: marcados, passosPulados: pulados }
}

function textoPesquisavel(procedimento: Procedure) {
  return normalizar(
    [
      procedimento.titulo,
      procedimento.descricao,
      ...procedimento.secoes.flatMap((secao) => [
        secao.titulo,
        ...secao.passos.flatMap((passo) => [
          passo.texto,
          passo.codigo ?? '',
          passo.alerta ?? '',
          ...passo.subpassos.map((subpasso) => subpasso.texto),
        ]),
      ]),
    ].join('\n'),
  )
}

/**
 * Procedimentos que contêm todas as palavras do termo (sem diferenciar acentos e maiúsculas),
 * em título, descrição, seções ou passos. Quem tem a busca no título vem primeiro.
 */
export function buscarProcedimentos(procedimentos: Procedure[], termo: string) {
  const palavras = normalizar(termo).split(/\s+/).filter(Boolean)
  const porTitulo = (a: Procedure, b: Procedure) => a.titulo.localeCompare(b.titulo, 'pt-BR')
  if (palavras.length === 0) return [...procedimentos].sort(porTitulo)

  const pontuar = (procedimento: Procedure) => {
    const titulo = normalizar(procedimento.titulo)
    return palavras.every((palavra) => titulo.includes(palavra)) ? 0 : 1
  }
  return procedimentos
    .filter((procedimento) => {
      const texto = textoPesquisavel(procedimento)
      return palavras.every((palavra) => texto.includes(palavra))
    })
    .sort((a, b) => pontuar(a) - pontuar(b) || porTitulo(a, b))
}
