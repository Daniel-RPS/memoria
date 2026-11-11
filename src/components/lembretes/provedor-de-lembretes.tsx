import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router'
import {
  carregarLembretesComAlvos,
  marcarVistos,
  type AvisoDisparado,
} from '@/db/repositories/lembrete-repository'
import type { Lembrete } from '@/db/types'
import { contarNaoVistos, contextoDoAviso, detalheDoAlvo, tituloDaAba } from '@/domain/lembretes'
import { ContextoLembretes, type DadosDosLembretes } from '@/hooks/contexto-lembretes'
import { useMotorDeLembretes } from '@/hooks/use-motor-de-lembretes'
import { entregar, type PayloadDoAviso } from '@/lib/entrega-de-avisos'
import { MAXIMO_DE_CARDS, PilhaDeAvisos } from '@/components/lembretes/pilha-de-avisos'

function payloadDe({ lembrete, alvo }: AvisoDisparado): PayloadDoAviso {
  return {
    lembreteId: lembrete.id,
    alvo: {
      tipo: alvo.tipo,
      id: alvo.id,
      titulo: alvo.titulo,
      data: alvo.data,
      ...(alvo.horario ? { horario: alvo.horario } : {}),
    },
    antecedenciaMin: lembrete.antecedenciaMin,
    contexto: contextoDoAviso(lembrete.antecedenciaMin),
    detalhe: detalheDoAlvo(alvo),
  }
}

/**
 * Raiz dos lembretes: lê todos (reativo, também entre abas), roda o motor de disparo, mostra os
 * cards de aviso e põe a contagem de não vistos no título da aba ("(2) MemorIA").
 */
export function ProvedorDeLembretes({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const linhas = useLiveQuery(carregarLembretesComAlvos, [])
  /** Cards na tela (até `MAXIMO_DE_CARDS`) e os que esperam a vez, na ordem de chegada. */
  const [fila, setFila] = useState<PayloadDoAviso[]>([])

  const dados = useMemo<DadosDosLembretes>(() => {
    const porAlvo = new Map<string, Lembrete[]>()
    for (const { lembrete } of linhas ?? []) {
      porAlvo.set(lembrete.alvoId, [...(porAlvo.get(lembrete.alvoId) ?? []), lembrete])
    }
    return { linhas, porAlvo, naoVistos: linhas ? contarNaoVistos(linhas) : 0 }
  }, [linhas])

  useMotorDeLembretes(linhas, (avisos) => {
    for (const aviso of avisos) {
      entregar(aviso.lembrete.canais, payloadDe(aviso), {
        app: (payload) =>
          setFila((atual) =>
            atual.some((item) => item.lembreteId === payload.lembreteId)
              ? atual
              : [...atual, payload],
          ),
      })
    }
  })

  useEffect(() => {
    document.title = tituloDaAba(dados.naoVistos)
  }, [dados.naoVistos])

  function tirar(lembreteId: string) {
    setFila((atual) => atual.filter((item) => item.lembreteId !== lembreteId))
  }

  return (
    <ContextoLembretes.Provider value={dados}>
      {children}
      <PilhaDeAvisos
        avisos={fila.slice(0, MAXIMO_DE_CARDS)}
        onFechar={(id) => {
          tirar(id)
          void marcarVistos([id])
        }}
        onAbrir={(aviso) => {
          tirar(aviso.lembreteId)
          void marcarVistos([aviso.lembreteId])
          void navigate(`/dia/${aviso.alvo.data}`)
        }}
        onExpirar={tirar}
      />
    </ContextoLembretes.Provider>
  )
}
