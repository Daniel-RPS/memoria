import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Link } from 'react-router'
import type { Execution, Procedure } from '@/db/types'
import { deDataLocal } from '@/lib/datas'
import { useHistoricoProcedimento } from '@/features/procedimentos/hooks/use-procedimentos'

interface HistoricoProcedimentoProps {
  procedimento: Procedure
}

function formatarMomento(iso: string) {
  return format(parseISO(iso), "d 'de' MMM 'de' yyyy, HH:mm", { locale: ptBR })
}

/** Execuções (com o que foi preenchido, feito e pulado) e versões anteriores. */
export function HistoricoProcedimento({ procedimento }: HistoricoProcedimentoProps) {
  const { execucoes, versoes } = useHistoricoProcedimento(procedimento.id)

  return (
    <div className="mt-12 grid gap-10 md:grid-cols-[2fr_1fr]">
      <section aria-labelledby="titulo-execucoes">
        <h2 id="titulo-execucoes" className="text-xl font-bold">
          Execuções
        </h2>
        {execucoes.length === 0 ? (
          <p className="mt-2 text-grafite">Ainda não foi executado.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {execucoes.map((execucao) => (
              <ItemExecucao key={execucao.id} execucao={execucao} procedimento={procedimento} />
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="titulo-versoes">
        <h2 id="titulo-versoes" className="text-xl font-bold">
          Versões anteriores
        </h2>
        {versoes.length === 0 ? (
          <p className="mt-2 text-grafite">Nenhuma edição salva ainda.</p>
        ) : (
          <ul className="mt-3 flex flex-col">
            {versoes.map((versao) => (
              <li key={versao.id} className="border-b border-pauta last:border-b-0">
                <Link
                  to={`/procedimentos/${procedimento.id}/versoes/${versao.versao}`}
                  className="block py-2 hover:text-caneta focus-visible:outline-2 focus-visible:outline-caneta"
                >
                  Versão {versao.versao}
                  <span className="block text-sm text-grafite">
                    substituída em {formatarMomento(versao.alteradoEm)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

interface ItemExecucaoProps {
  execucao: Execution
  procedimento: Procedure
}

function ItemExecucao({ execucao, procedimento }: ItemExecucaoProps) {
  const feitos = execucao.passosMarcados.length
  const pulados = execucao.passosPulados.length
  const valores = Object.entries(execucao.valoresCampos).filter(([, valor]) => valor.trim())
  const nomeDoCampo = (id: string) =>
    procedimento.camposVariaveis.find((campo) => campo.id === id)?.nome ?? 'Campo removido'
  const dia = format(deDataLocal(execucao.data), "d 'de' MMM 'de' yyyy", { locale: ptBR })

  return (
    <li className="rounded-md border border-pauta bg-papel">
      <details className="group">
        <summary className="flex cursor-pointer flex-wrap items-baseline gap-x-3 px-4 py-3 marker:text-grafite">
          <span className="font-semibold">{dia}</span>
          <span className="text-sm text-grafite">
            {execucao.concluidaEm ? 'concluída' : 'em andamento'}, versão {execucao.versao}
          </span>
          <span className="text-sm text-grafite">
            {feitos} {feitos === 1 ? 'passo feito' : 'passos feitos'}
            {pulados > 0 && `, ${pulados} ${pulados === 1 ? 'pulado' : 'pulados'}`}
          </span>
        </summary>
        <div className="flex flex-col gap-3 border-t border-pauta px-4 py-3 text-[0.9375rem]">
          {valores.length > 0 && (
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
              {valores.map(([id, valor]) => (
                <div key={id} className="contents">
                  <dt className="text-grafite">{nomeDoCampo(id)}</dt>
                  <dd className="font-mono text-sm">{valor}</dd>
                </div>
              ))}
            </dl>
          )}
          {execucao.observacoes.trim() ? (
            <p className="whitespace-pre-wrap">{execucao.observacoes}</p>
          ) : (
            <p className="text-grafite">Sem observações.</p>
          )}
          {!execucao.concluidaEm && (
            <Link
              to={`/procedimentos/${procedimento.id}/executar${execucao.taskId ? `?tarefa=${execucao.taskId}` : ''}`}
              className="text-caneta underline-offset-4 hover:underline"
            >
              Continuar esta execução
            </Link>
          )}
        </div>
      </details>
    </li>
  )
}
