import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { gravarPreferencia, lerPreferencia } from '@/app/preferencia-local'
import {
  carregarDadosDosVinculos,
  listarNotas,
  obterNota,
  tiposDeAnexoDasNotas,
} from '@/db/repositories/note-repository'
import type { TipoAnexo } from '@/db/types'
import { useHoje } from '@/hooks/use-hoje'
import {
  donoDaNota,
  indexarVinculos,
  MODOS_DAS_NOTAS,
  type ModoDasNotas,
  type NotaComDono,
} from '@/lib/notas'

/**
 * Todas as notas com o dono de cada uma (caminho, categoria, cor) e os tipos de anexo.
 * Trocar a categoria de um grupo muda o bloco das notas na hora (é lida a cada mudança).
 */
export function useNotas() {
  const hoje = useHoje()
  const resultado = useLiveQuery(async () => {
    const notas = await listarNotas()
    const [dados, anexos] = await Promise.all([
      carregarDadosDosVinculos(notas),
      tiposDeAnexoDasNotas(notas.map((nota) => nota.id)),
    ])
    const indice = indexarVinculos(dados, hoje)
    const comDono: NotaComDono[] = notas.map((nota) => ({
      nota,
      dono: donoDaNota(nota.vinculo, indice),
    }))
    const categorias = dados.categorias.filter((categoria) => categoria.tipo === 'grupo')
    return { notas: comDono, anexos, categorias }
  }, [hoje])
  return {
    notas: resultado?.notas ?? [],
    anexosPorNota: resultado?.anexos ?? new Map<string, Set<TipoAnexo>>(),
    /** Categorias do tipo Grupo, na ordem do usuário (blocos "Por categoria"). */
    categorias: resultado?.categorias ?? [],
    isCarregando: resultado === undefined,
  }
}

/** Uma nota; `null` se não existir. */
export function useNota(id: string) {
  const nota = useLiveQuery(async () => (await obterNota(id)) ?? null, [id])
  return { nota, isCarregando: nota === undefined }
}

export const CHAVE_MODO_DAS_NOTAS = 'memoria:notas-modo'

function isModo(valor: string | null): valor is ModoDasNotas {
  return MODOS_DAS_NOTAS.includes(valor as ModoDasNotas)
}

/** Organização da aba Notas, lembrada entre sessões ("Por categoria" sem escolha). */
export function useModoDasNotas() {
  const [modo, setModo] = useState<ModoDasNotas>(() => {
    const lido = lerPreferencia(CHAVE_MODO_DAS_NOTAS)
    return isModo(lido) ? lido : 'categoria'
  })

  function handleEscolher(novo: ModoDasNotas) {
    setModo(novo)
    gravarPreferencia(CHAVE_MODO_DAS_NOTAS, novo)
  }

  return { modo, handleEscolher }
}
