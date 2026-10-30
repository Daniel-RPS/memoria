import { format } from 'date-fns'
import { z } from 'zod'
import type { Dono, TipoAnexo } from '@/db/types'

/** Só http e https: um link `javascript:` ou `data:` poderia executar código ao ser aberto. */
export const esquemaLink = z.object({
  url: z
    .string()
    .trim()
    .min(1, 'Cole o endereço do link.')
    .refine((texto) => {
      try {
        const url = new URL(texto)
        return url.protocol === 'http:' || url.protocol === 'https:'
      } catch {
        return false
      }
    }, 'Use um endereço que comece com http:// ou https://.'),
  nome: z.string().trim().max(200, 'Use no máximo 200 caracteres.'),
})

export type LinkInput = z.infer<typeof esquemaLink>

/** Texto mostrado para um link sem nome: o domínio, sem "www.". */
export function nomeDoLink(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

const PREFIXO_DO_NOME: Record<Exclude<TipoAnexo, 'link'>, string> = {
  foto: 'Foto',
  desenho: 'Desenho',
  audio: 'Áudio',
}

/** Nome automático, ex.: "Foto de 30/10 14:05". */
export function nomePadrao(tipo: Exclude<TipoAnexo, 'link'>, momento: Date) {
  return `${PREFIXO_DO_NOME[tipo]} de ${format(momento, 'dd/MM HH:mm')}`
}

/** "0:07", "1:30", "12:05" */
export function formatarDuracao(segundos: number) {
  const inteiros = Math.max(0, Math.floor(segundos))
  return `${Math.floor(inteiros / 60)}:${String(inteiros % 60).padStart(2, '0')}`
}

/** Chave estável de um dono, para consultas e para a interface. */
export function chaveDoDono(dono: Dono) {
  return `${dono.tipo}:${dono.id}`
}

export function descreverQuantidade(quantidade: number) {
  return quantidade === 1 ? '1 anexo' : `${quantidade} anexos`
}
