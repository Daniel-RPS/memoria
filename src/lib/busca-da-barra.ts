import type { LucideIcon } from 'lucide-react'

export interface DestinoDaBarra {
  nome: string
  icone: LucideIcon
  para: string
  isAtiva: boolean
  grupo?: string
}

const PALAVRAS_CHAVE_POR_NOME: Record<string, string> = {
  Dia: 'hoje tarefas',
  Grupos: 'cards',
  Procedimentos: 'protocolos etapas',
  Notas: 'anotações',
  Categorias: 'cores',
  Arquivados: 'arquivo',
  Backup: 'exportar importar',
  Notificações: 'avisos lembretes',
  Números: 'quantidade',
  Tempo: 'horas',
}

function normalizarTexto(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

export function filtrarDestinos(
  destinos: DestinoDaBarra[],
  consulta: string,
): DestinoDaBarra[] {
  const consultaLimpa = consulta.trim()
  if (!consultaLimpa) {
    return destinos
  }

  const palavrasConsulta = normalizarTexto(consultaLimpa)
    .split(/\s+/)
    .filter(Boolean)

  if (palavrasConsulta.length === 0) {
    return destinos
  }

  return destinos.filter((destino) => {
    const nomeNorm = normalizarTexto(destino.nome)
    const grupoNorm = destino.grupo ? normalizarTexto(destino.grupo) : ''
    const palavrasChave = PALAVRAS_CHAVE_POR_NOME[destino.nome]
    const palavrasChaveNorm = palavrasChave ? normalizarTexto(palavrasChave) : ''

    const textoTotal = `${nomeNorm} ${grupoNorm} ${palavrasChaveNorm}`

    return palavrasConsulta.every((palavra) => textoTotal.includes(palavra))
  })
}
