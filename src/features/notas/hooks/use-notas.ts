import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { gravarPreferencia, lerPreferencia } from '@/app/preferencia-local'
import {
  carregarDadosDosVinculos,
  listarNotas,
  metadadosDeAnexosDasNotas,
  obterNota,
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
    const [dados, metadados] = await Promise.all([
      carregarDadosDosVinculos(notas),
      metadadosDeAnexosDasNotas(notas.map((nota) => nota.id)),
    ])
    const indice = indexarVinculos(dados, hoje)
    const comDono: (NotaComDono & { nomesAnexos?: string[] })[] = notas.map((nota) => ({
      nota,
      dono: donoDaNota(nota.vinculo, indice),
      nomesAnexos: metadados.get(nota.id)?.nomesAnexos ?? [],
    }))
    // Grupo primeiro, depois Procedimento (cada tipo na ordem do usuário).
    const categorias = [
      ...dados.categorias.filter((categoria) => categoria.tipo === 'grupo'),
      ...dados.categorias.filter((categoria) => categoria.tipo === 'procedimento'),
    ]
    return { notas: comDono, metadados, categorias }
  }, [hoje])

  const anexosPorNota = new Map<string, Set<TipoAnexo>>()
  const docsPorNota = new Map<string, number>()
  if (resultado?.metadados) {
    for (const [id, meta] of resultado.metadados.entries()) {
      anexosPorNota.set(id, meta.tipos)
      docsPorNota.set(id, meta.quantosDocumentos)
    }
  }

  return {
    notas: resultado?.notas ?? [],
    anexosPorNota,
    docsPorNota,
    /** Categorias de Grupo e depois as de Procedimento, na ordem do usuário ("Por categoria"). */
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
