import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ContextoCategorias } from '@/hooks/contexto-categorias'
import { useCategorias } from '@/hooks/use-categorias'
import { useHoje } from '@/hooks/use-hoje'
import { deDataLocal } from '@/lib/datas'
import { BlocoAtrasadas } from '@/features/inicio/components/bloco-atrasadas'
import { BlocoEmAndamento } from '@/features/inicio/components/bloco-em-andamento'
import { BlocoHoje } from '@/features/inicio/components/bloco-hoje'
import { CapturaRapida } from '@/features/inicio/components/captura-rapida'
import { MapaDeConclusoes } from '@/features/inicio/components/mapa-de-conclusoes'
import { ProximosDias } from '@/features/inicio/components/proximos-dias'
import {
  useAtrasadas,
  useEmAndamentoNoInicio,
  useHojeNoInicio,
  useProximosDias,
} from '@/features/inicio/hooks/use-resumo-do-inicio'

function capitalizar(texto: string) {
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

/**
 * Porta de entrada: anotar (captura rápida) e o mapa do último ano; ao lado, discretos, o que
 * está em hoje, o que ficou para trás e os próximos 7 dias.
 */
export function InicioPage() {
  const hoje = useHoje()
  const { categorias } = useCategorias()
  const emAndamento = useEmAndamentoNoInicio(hoje)
  const resumoDeHoje = useHojeNoInicio(hoje)
  const atrasadas = useAtrasadas(hoje)
  const proximos = useProximosDias(hoje)
  const dia = deDataLocal(hoje)

  return (
    <ContextoCategorias.Provider value={categorias}>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <h1 className="text-4xl font-extrabold tracking-[-0.02em] [font-stretch:80%]">Início</h1>
        <p className="text-grafite">
          <span className="font-semibold text-tinta">
            {capitalizar(format(dia, 'EEEE', { locale: ptBR }))}
          </span>
          , {format(dia, "d 'de' MMMM", { locale: ptBR })}
        </p>
      </header>
      <div className="grid gap-x-6 gap-y-8 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <CapturaRapida key={hoje} hoje={hoje} />
          <MapaDeConclusoes hoje={hoje} />
        </div>
        <aside
          aria-label="Hoje, atrasadas e próximos dias"
          className="flex flex-col gap-3.5 lg:pt-0"
        >
          <BlocoEmAndamento resumo={emAndamento} />
          <BlocoHoje numeros={resumoDeHoje} hoje={hoje} />
          <BlocoAtrasadas numeros={atrasadas.numeros} />
          <ProximosDias dias={proximos} />
        </aside>
      </div>
    </ContextoCategorias.Provider>
  )
}
