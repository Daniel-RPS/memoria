import type { Note } from '@/db/types'
import { normalizar } from '@/lib/procedimentos'

/** Tamanho máximo do título tirado da primeira linha do texto. */
const TAMANHO_TITULO_AUTOMATICO = 80

/** Título mostrado: o próprio, a primeira linha do texto ou "Sem título". */
export function tituloDaNota(nota: Pick<Note, 'titulo' | 'conteudo'>) {
  if (nota.titulo.trim()) return nota.titulo.trim()
  const primeiraLinha = nota.conteudo.split('\n').find((linha) => linha.trim())
  return primeiraLinha?.trim().slice(0, TAMANHO_TITULO_AUTOMATICO) || 'Sem título'
}

/** Notas que contêm todas as palavras do termo no título ou no texto (sem acentos). */
export function buscarNotas<T extends Pick<Note, 'titulo' | 'conteudo'>>(
  notas: T[],
  termo: string,
) {
  const palavras = normalizar(termo).split(/\s+/).filter(Boolean)
  if (palavras.length === 0) return notas
  return notas.filter((nota) => {
    const texto = normalizar(`${nota.titulo}\n${nota.conteudo}`)
    return palavras.every((palavra) => texto.includes(palavra))
  })
}
