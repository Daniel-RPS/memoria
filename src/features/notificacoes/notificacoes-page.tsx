import { useEffect, useState } from 'react'
import { CabecalhoPagina } from '@/components/cabecalho-pagina'
import { marcarVistos } from '@/db/repositories/lembrete-repository'
import { montarNotificacoes } from '@/domain/lembretes'
import { useDadosDosLembretes } from '@/hooks/contexto-lembretes'
import { useHoje } from '@/hooks/use-hoje'
import { EstadoVazio } from '@/features/notificacoes/components/estado-vazio'
import { ListaAgendadas } from '@/features/notificacoes/components/lista-agendadas'
import { SecaoAnteriores } from '@/features/notificacoes/components/secao-anteriores'
import { useAgoraQueAnda } from '@/features/notificacoes/hooks/use-agora-que-anda'

/**
 * Aba Notificações: os avisos agendados por dia do evento e os anteriores (disparados ou
 * perdidos). Abrir a aba marca todos como vistos; os que chegaram sem ser vistos ficam
 * destacados como "novo" enquanto a aba está aberta.
 */
export function NotificacoesPage() {
  const { linhas } = useDadosDosLembretes()
  const hoje = useHoje()
  const agora = useAgoraQueAnda()
  const [novos, setNovos] = useState<Set<string>>(() => new Set())
  const [isAnterioresAberta, setIsAnterioresAberta] = useState(false)
  const visao = linhas ? montarNotificacoes(linhas, agora) : undefined
  const idsNaoVistos = (visao?.anteriores ?? [])
    .filter((linha) => linha.isNaoVisto)
    .map((linha) => linha.lembrete.id)
  const chaveNaoVistos = idsNaoVistos.join(',')

  const [chaveDestacada, setChaveDestacada] = useState('')
  // Chegaram não vistos: ficam destacados como "novo" e "Anteriores" abre sozinha.
  if (chaveNaoVistos !== '' && chaveNaoVistos !== chaveDestacada) {
    setChaveDestacada(chaveNaoVistos)
    setNovos((atuais) => new Set([...atuais, ...idsNaoVistos]))
    setIsAnterioresAberta(true)
  }

  // Na aba, todo aviso não visto passa a visto (também os que dispararem com ela aberta).
  useEffect(() => {
    if (chaveNaoVistos !== '') void marcarVistos(chaveNaoVistos.split(','))
  }, [chaveNaoVistos])

  if (!visao) return null
  const isVazio = visao.agendadas.length === 0 && visao.anteriores.length === 0
  const { totalAgendados } = visao

  return (
    <div className="flex flex-col gap-8">
      <CabecalhoPagina
        titulo="Notificações"
        descricao={
          totalAgendados === 0
            ? 'Nenhum aviso agendado.'
            : `${totalAgendados} ${totalAgendados === 1 ? 'aviso agendado' : 'avisos agendados'}.`
        }
      />
      {isVazio ? (
        <EstadoVazio />
      ) : (
        <>
          <ListaAgendadas agendadas={visao.agendadas} hoje={hoje} agora={agora} />
          {visao.anteriores.length > 0 && (
            <SecaoAnteriores
              anteriores={visao.anteriores}
              novos={novos}
              agora={agora}
              isAberta={isAnterioresAberta}
              onAlternar={() => setIsAnterioresAberta((atual) => !atual)}
            />
          )}
        </>
      )}
    </div>
  )
}
