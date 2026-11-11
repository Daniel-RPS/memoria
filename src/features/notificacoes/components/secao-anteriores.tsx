import { BellRing, Trash2 } from 'lucide-react'
import { Link } from 'react-router'
import { cn } from 'cn'
import { SecaoRecolhivel } from '@/components/secao-recolhivel'
import { Button } from '@/components/ui/button'
import { limparAnteriores, type AlvoDetalhado } from '@/db/repositories/lembrete-repository'
import {
  MAXIMO_DE_ANTERIORES,
  detalheDoAlvo,
  quandoTexto,
  rotuloCurtoDaAntecedencia,
  type LinhaAnterior,
} from '@/domain/lembretes'

interface SecaoAnterioresProps {
  anteriores: LinhaAnterior<AlvoDetalhado>[]
  /** Não vistos quando a aba abriu: destacados como "novo". */
  novos: Set<string>
  agora: Date
  isAberta: boolean
  onAlternar: () => void
}

/** Avisos já disparados ou perdidos, mais recentes primeiro (até 50), com "Limpar anteriores". */
export function SecaoAnteriores({
  anteriores,
  novos,
  agora,
  isAberta,
  onAlternar,
}: SecaoAnterioresProps) {
  const exibidos = anteriores.slice(0, MAXIMO_DE_ANTERIORES)
  return (
    <SecaoRecolhivel
      titulo="Anteriores"
      contagem={anteriores.length}
      isAberta={isAberta}
      onAlternar={onAlternar}
    >
      <ul className="flex flex-col divide-y divide-pauta">
        {exibidos.map((linha) => {
          const isNovo = novos.has(linha.lembrete.id)
          const detalhe = detalheDoAlvo(linha.alvo)
          return (
            <li key={linha.lembrete.id}>
              <Link
                to={`/dia/${linha.alvo.data}`}
                className={cn(
                  'flex flex-wrap items-start gap-x-3 gap-y-1 rounded-md px-2 py-2.5 outline-none hover:bg-accent/60 focus-visible:ring-3 focus-visible:ring-ring/50',
                  isNovo && 'bg-accent/50',
                )}
              >
                <BellRing aria-hidden className="mt-0.5 size-4 shrink-0 text-grafite" />
                <span className="min-w-0 flex-1">
                  <span className="block break-words text-tinta">{linha.alvo.titulo}</span>
                  <span className="block text-xs text-grafite tabular-nums">
                    {linha.isPerdido ? 'Era para avisar' : 'Avisou'}{' '}
                    {quandoTexto(linha.momento, agora)} ·{' '}
                    {rotuloCurtoDaAntecedencia(linha.lembrete.antecedenciaMin)}
                    {detalhe && ` · ${detalhe}`}
                  </span>
                </span>
                <span className="flex shrink-0 gap-1.5">
                  {isNovo && (
                    <span className="rounded-full bg-caneta px-2 py-0.5 text-[0.6875rem] font-semibold text-primary-foreground">
                      novo
                    </span>
                  )}
                  {linha.isPerdido && (
                    <span className="rounded-full border border-alerta/40 px-2 py-0.5 text-[0.6875rem] font-semibold text-alerta">
                      Perdido
                    </span>
                  )}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-xs text-grafite">
          {anteriores.length > MAXIMO_DE_ANTERIORES
            ? `Mostrando os ${MAXIMO_DE_ANTERIORES} mais recentes.`
            : ''}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => void limparAnteriores(anteriores.map((linha) => linha.lembrete.id))}
        >
          <Trash2 /> Limpar anteriores
        </Button>
      </div>
    </SecaoRecolhivel>
  )
}
