import type { ReactNode } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Checkbox } from '@/components/ui/checkbox'
import type { DataLocal } from '@/db/types'
import { deDataLocal } from '@/lib/datas'
import type { Duplicados } from '@/lib/importar/planejar'
import type { RascunhoDeImportacao } from '@/lib/importar/rascunho'

interface ListaDaPreviaProps {
  rascunho: RascunhoDeImportacao
  dataPadrao: DataLocal
  duplicados: Duplicados
  desmarcadas: ReadonlySet<string>
  onMarcar: (chave: string, isMarcada: boolean) => void
}

interface Linha {
  chave: string
  titulo: string
  detalhe: string
}

const diaCurto = (data: DataLocal) => format(deDataLocal(data), "EEE, d 'de' MMM", { locale: ptBR })
const plural = (quantidade: number, um: string, varios: string) =>
  `${quantidade} ${quantidade === 1 ? um : varios}`

/** O que vai ser criado, por tipo, com uma caixa por entrada para deixar de fora. */
export function ListaDaPrevia({
  rascunho,
  dataPadrao,
  duplicados,
  desmarcadas,
  onMarcar,
}: ListaDaPreviaProps) {
  const blocos: { titulo: string; linhas: Linha[] }[] = [
    {
      titulo: 'Tarefas',
      linhas: rascunho.tarefas.map((tarefa) => ({
        chave: tarefa.chave,
        titulo: tarefa.titulo,
        detalhe: [
          diaCurto(tarefa.data ?? dataPadrao),
          tarefa.isConcluida ? 'concluída' : '',
          tarefa.subtarefas.length
            ? plural(tarefa.subtarefas.length, 'subtarefa', 'subtarefas')
            : '',
          tarefa.categoria ?? '',
        ]
          .filter(Boolean)
          .join(' · '),
      })),
    },
    {
      titulo: 'Grupos',
      linhas: rascunho.grupos.map((grupo) => ({
        chave: grupo.chave,
        titulo: grupo.titulo,
        detalhe: [
          diaCurto(grupo.data ?? dataPadrao),
          plural(grupo.itens.length, 'item', 'itens'),
          grupo.categoria ?? '',
        ]
          .filter(Boolean)
          .join(' · '),
      })),
    },
    {
      titulo: 'Procedimentos',
      linhas: rascunho.procedimentos.map((procedimento) => ({
        chave: procedimento.chave,
        titulo: procedimento.titulo,
        detalhe: [
          plural(procedimento.etapas.length, 'etapa', 'etapas'),
          procedimento.categoria ?? '',
        ]
          .filter(Boolean)
          .join(' · '),
      })),
    },
    {
      titulo: 'Notas',
      linhas: rascunho.notas.map((nota) => ({
        chave: nota.chave,
        titulo: nota.titulo || 'Sem título',
        detalhe: nota.anexos.length ? plural(nota.anexos.length, 'anexo', 'anexos') : '',
      })),
    },
  ]
  const comLinhas = blocos.filter((bloco) => bloco.linhas.length > 0)

  if (comLinhas.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-pauta px-3 py-4 text-center text-grafite">
        Nada para importar ainda. Volte e confira o texto ou o arquivo.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {comLinhas.map((bloco) => {
        const marcadas = bloco.linhas.filter((linha) => !desmarcadas.has(linha.chave)).length
        return (
          <section key={bloco.titulo} aria-label={bloco.titulo}>
            <h3 className="mb-1 flex items-baseline gap-2 border-b border-pauta pb-1 text-sm font-semibold">
              {bloco.titulo}
              <span className="font-normal text-grafite tabular-nums">
                {marcadas === bloco.linhas.length
                  ? marcadas
                  : `${marcadas} de ${bloco.linhas.length}`}
              </span>
            </h3>
            <ul className="flex flex-col">
              {bloco.linhas.map((linha) => (
                <LinhaDaPrevia
                  key={linha.chave}
                  linha={linha}
                  isMarcada={!desmarcadas.has(linha.chave)}
                  selo={duplicados.has(linha.chave) ? 'já existe' : undefined}
                  onMarcar={(isMarcada) => onMarcar(linha.chave, isMarcada)}
                />
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}

function LinhaDaPrevia({
  linha,
  isMarcada,
  selo,
  onMarcar,
}: {
  linha: Linha
  isMarcada: boolean
  selo?: ReactNode
  onMarcar: (isMarcada: boolean) => void
}) {
  return (
    <li>
      <label className="flex cursor-pointer items-start gap-2 rounded-sm px-1 py-1 hover:bg-accent/60">
        <Checkbox
          checked={isMarcada}
          onCheckedChange={(marcada) => onMarcar(marcada === true)}
          className="mt-0.5"
        />
        <span className="min-w-0 flex-1">
          <span
            className={
              isMarcada
                ? 'break-words'
                : 'break-words text-grafite line-through decoration-tinta/40'
            }
          >
            {linha.titulo}
          </span>
          {selo && (
            <span className="ml-1.5 rounded-[3px] bg-marca-texto px-1 text-xs font-medium whitespace-nowrap text-violeta-profundo">
              {selo}
            </span>
          )}
          {linha.detalhe && <span className="block text-xs text-grafite">{linha.detalhe}</span>}
        </span>
      </label>
    </li>
  )
}
