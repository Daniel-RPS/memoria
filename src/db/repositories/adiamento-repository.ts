import { db } from '@/db/database'
import { registrosDeAdiamento, type MudancaDeDia } from '@/domain/adiamentos'

/**
 * Grava os adiamentos das mudanças (só as que vão para um dia posterior) e devolve os ids, para
 * o "Desfazer" apagar. Chame dentro da transação da mudança, com `db.adiamentos` nas tabelas.
 */
export async function registrarAdiamentos(mudancas: MudancaDeDia[], momento: string) {
  const registros = registrosDeAdiamento(mudancas, momento, () => crypto.randomUUID())
  if (registros.length > 0) await db.adiamentos.bulkAdd(registros)
  return registros.map((registro) => registro.id)
}

/** Apaga os adiamentos gravados por uma ação desfeita. */
export async function apagarAdiamentos(ids: string[] | undefined) {
  if (ids && ids.length > 0) await db.adiamentos.bulkDelete(ids)
}
