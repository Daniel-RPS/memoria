import { useLiveQuery } from 'dexie-react-hooks'
import { contarAnexos } from '@/db/repositories/attachment-repository'
import { listarNotas, obterNota } from '@/db/repositories/note-repository'

/** Notas avulsas com a quantidade de anexos de cada uma. */
export function useNotas() {
  const resultado = useLiveQuery(async () => {
    const notas = await listarNotas()
    const anexos = await contarAnexos(
      'note',
      notas.map((nota) => nota.id),
    )
    return { notas, anexos }
  }, [])
  return {
    notas: resultado?.notas ?? [],
    anexosPorNota: resultado?.anexos ?? new Map<string, number>(),
    isCarregando: resultado === undefined,
  }
}

/** Uma nota; `null` se não existir. */
export function useNota(id: string) {
  const nota = useLiveQuery(async () => (await obterNota(id)) ?? null, [id])
  return { nota, isCarregando: nota === undefined }
}
