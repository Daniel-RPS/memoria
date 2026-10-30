import { TriangleAlert } from 'lucide-react'
import type { Procedure } from '@/db/types'
import { AnexosDoPasso } from '@/features/procedimentos/components/anexos-do-passo'
import { BlocoCodigo } from '@/features/procedimentos/components/bloco-codigo'
import { TextoComCampos } from '@/features/procedimentos/components/texto-com-campos'

interface ConteudoProcedimentoProps {
  procedimento: Procedure
  /** Na página do procedimento dá para anexar aos passos; em versões antigas, só ver. */
  isAnexosEditaveis?: boolean
}

/** Seções e passos numerados, só para leitura (página do procedimento e versões antigas). */
export function ConteudoProcedimento({
  procedimento,
  isAnexosEditaveis,
}: ConteudoProcedimentoProps) {
  const campos = procedimento.camposVariaveis
  const primeiroNumeroDaSecao = procedimento.secoes.map((_, indice) =>
    procedimento.secoes.slice(0, indice).reduce((total, secao) => total + secao.passos.length, 1),
  )

  return (
    <div className="flex flex-col gap-8">
      {procedimento.secoes.map((secao, indiceSecao) => (
        <section key={secao.id} aria-label={secao.titulo}>
          <h2 className="text-xl font-bold">{secao.titulo}</h2>
          <ol className="mt-3 flex list-decimal flex-col gap-4 pl-6 marker:font-semibold marker:text-grafite">
            {secao.passos.map((passo, indicePasso) => (
              <li key={passo.id} className="pl-1">
                <p className="whitespace-pre-wrap">
                  <TextoComCampos texto={passo.texto} campos={campos} />
                </p>
                {passo.subpassos.length > 0 && (
                  <ul className="mt-1 list-disc pl-5 text-[0.9375rem]">
                    {passo.subpassos.map((subpasso) => (
                      <li key={subpasso.id}>
                        <TextoComCampos texto={subpasso.texto} campos={campos} />
                      </li>
                    ))}
                  </ul>
                )}
                {passo.alerta && <Alerta texto={passo.alerta} procedimento={procedimento} />}
                {passo.codigo && <BlocoCodigo codigo={passo.codigo} campos={campos} />}
                <AnexosDoPasso
                  passoId={passo.id}
                  numero={primeiroNumeroDaSecao[indiceSecao] + indicePasso}
                  isSomenteLeitura={!isAnexosEditaveis}
                />
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  )
}

interface AlertaProps {
  texto: string
  procedimento: Pick<Procedure, 'camposVariaveis'>
  valores?: Record<string, string>
}

/** Aviso de cuidado dentro de um passo. */
export function Alerta({ texto, procedimento, valores }: AlertaProps) {
  return (
    <p className="mt-2 flex gap-2 rounded-md border-l-4 border-l-marca-texto bg-marca-texto/15 px-3 py-2 text-[0.9375rem]">
      <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
      <span>
        <span className="sr-only">Atenção: </span>
        <TextoComCampos texto={texto} campos={procedimento.camposVariaveis} valores={valores} />
      </span>
    </p>
  )
}
