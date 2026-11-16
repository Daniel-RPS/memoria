import { z } from 'zod'
import {
  lerPreferencia,
  gravarPreferencia,
  removerPreferencia,
} from '@/app/preferencia-local'

const PREFIXO = 'memoria:rascunho:'
const SETE_DIAS_MS = 7 * 24 * 60 * 60 * 1000

function chaveCompleta(chave: string): string {
  return `${PREFIXO}${chave}`
}

const envelopeEsquema = z.object({
  valor: z.unknown(),
  em: z.number(),
})

/**
 * Lê um rascunho salvo no localStorage.
 * Retorna `null` se faltar, JSON quebrado, formato inválido, validação do esquema falhar,
 * ou se tiver expirado há mais de 7 dias (limpando o rascunho expirado).
 */
export function lerRascunho<T>(chave: string, esquema: z.ZodType<T>): T | null {
  const bruta = chaveCompleta(chave)
  const conteudo = lerPreferencia(bruta)
  if (!conteudo) return null

  try {
    const parseado = JSON.parse(conteudo)
    const envelope = envelopeEsquema.safeParse(parseado)
    if (!envelope.success) {
      limparRascunho(chave)
      return null
    }

    if (Date.now() - envelope.data.em > SETE_DIAS_MS) {
      limparRascunho(chave)
      return null
    }

    const validado = esquema.safeParse(envelope.data.valor)
    if (!validado.success) {
      limparRascunho(chave)
      return null
    }

    return validado.data
  } catch {
    limparRascunho(chave)
    return null
  }
}

/**
 * Grava o valor do rascunho com o timestamp atual.
 */
export function gravarRascunho<T>(chave: string, valor: T): void {
  const bruta = chaveCompleta(chave)
  try {
    const envelope = {
      valor,
      em: Date.now(),
    }
    gravarPreferencia(bruta, JSON.stringify(envelope))
  } catch {
    // Tolerante a falha de armazenamento
  }
}

/**
 * Remove o rascunho da chave especificada.
 */
export function limparRascunho(chave: string): void {
  const bruta = chaveCompleta(chave)
  removerPreferencia(bruta)
}

/**
 * Verifica se existe rascunho na chave (não expirado e JSON válido).
 */
export function temRascunho(chave: string): boolean {
  const bruta = chaveCompleta(chave)
  const conteudo = lerPreferencia(bruta)
  if (!conteudo) return false

  try {
    const parseado = JSON.parse(conteudo)
    const envelope = envelopeEsquema.safeParse(parseado)
    if (!envelope.success) {
      limparRascunho(chave)
      return false
    }

    if (Date.now() - envelope.data.em > SETE_DIAS_MS) {
      limparRascunho(chave)
      return false
    }

    return true
  } catch {
    limparRascunho(chave)
    return false
  }
}
