import { useId } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm, useWatch, type Control } from 'react-hook-form'
import { z } from 'zod'
import { EscolhaDoDia } from '@/components/escolha-do-dia'
import { AvisosDaPrevia } from '@/components/importar/avisos-da-previa'
import { ListaDaPrevia } from '@/components/importar/lista-da-previa'
import { MapeamentoCsv } from '@/components/importar/mapeamento-csv'
import { PartesDoBackup } from '@/components/importar/partes-do-backup'
import { RodapeDaEtapa } from '@/components/importar/rodape-da-etapa'
import type { OpcoesDaImportacao, useImportacao } from '@/components/importar/use-importacao'
import { CampoCategoria } from '@/components/seletor-categoria/campo-categoria'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import type { TipoCategoria } from '@/db/types'
import type { CategoriaDoDestino } from '@/db/repositories/importacao-repository'
import { useHoje } from '@/hooks/use-hoje'
import { isDataLocalValida } from '@/lib/datas'
import {
  acharDuplicados,
  categoriasDoRascunho,
  planejarImportacao,
  contarPlano,
  ROTULO_DA_ACAO,
  type AcaoParaDuplicado,
} from '@/lib/importar/planejar'

const esquemaCategoria = z.object({
  isDaOrigem: z.boolean(),
  categoryId: z.string(),
  subcategoryId: z.string(),
})

const esquemaOpcoes = z.object({
  data: z.string().refine(isDataLocalValida, 'Escolha um dia.'),
  acao: z.enum(['pular', 'importar', 'substituir']),
  grupo: esquemaCategoria,
  procedimento: esquemaCategoria,
})

type OpcoesInput = z.infer<typeof esquemaOpcoes>
type CategoriaInput = z.infer<typeof esquemaCategoria>

const EXPLICACAO_DA_ACAO: Record<AcaoParaDuplicado, string> = {
  pular: 'Deixa de fora o que já existe.',
  importar: 'Cria outro com o mesmo título.',
  substituir: 'Atualiza o que já existe (o “Desfazer” devolve como estava).',
}

function paraDestino({
  isDaOrigem,
  categoryId,
  subcategoryId,
}: CategoriaInput): CategoriaDoDestino {
  if (isDaOrigem) return { modo: 'da-origem' }
  if (!categoryId) return { modo: 'nenhuma' }
  return { modo: 'escolhida', categoryId, subcategoryId: subcategoryId || undefined }
}

/** Etapa 3: o que será criado, onde e como; "Importar" grava tudo de uma vez. */
export function EtapaPrevia({ importacao }: { importacao: ReturnType<typeof useImportacao> }) {
  const hoje = useHoje()
  const idFormulario = useId()
  const { rascunho } = importacao
  const { control, handleSubmit, formState } = useForm<OpcoesInput>({
    resolver: zodResolver(esquemaOpcoes),
    defaultValues: {
      data: hoje,
      acao: 'pular',
      grupo: { isDaOrigem: false, categoryId: '', subcategoryId: '' },
      procedimento: { isDaOrigem: false, categoryId: '', subcategoryId: '' },
    },
  })
  const [data, acao] = useWatch({ control, name: ['data', 'acao'] })
  const duplicados = acharDuplicados(rascunho, importacao.existentes, data)
  const quantidade = contarPlano(
    planejarImportacao(rascunho, {
      desmarcadas: importacao.desmarcadas,
      duplicados,
      acao,
      dataPadrao: data,
    }),
  )
  const temDoCalendario = rascunho.tarefas.length + rascunho.grupos.length > 0
  const temSemData = [...rascunho.tarefas, ...rascunho.grupos].some((entrada) => !entrada.data)

  function handleImportar(opcoes: OpcoesInput) {
    const prontas: OpcoesDaImportacao = {
      data: opcoes.data,
      acao: opcoes.acao,
      categoriaDeGrupo: paraDestino(opcoes.grupo),
      categoriaDeProcedimento: paraDestino(opcoes.procedimento),
    }
    return importacao.handleImportar(prontas)
  }

  return (
    <>
      <form
        id={idFormulario}
        noValidate
        onSubmit={(evento) => void handleSubmit(handleImportar)(evento)}
        className="flex min-h-0 flex-col gap-5 overflow-y-auto px-5 py-4"
      >
        {importacao.origem === 'csv' && importacao.tabela && importacao.mapeamento && (
          <MapeamentoCsv
            cabecalho={importacao.tabela.cabecalho}
            mapeamento={importacao.mapeamento}
            onMudar={importacao.setMapeamento}
          />
        )}
        {importacao.origem === 'memoria' && importacao.backup && (
          <PartesDoBackup
            backup={importacao.backup}
            escolha={importacao.escolhaDoBackup}
            onMudar={importacao.setEscolhaDoBackup}
          />
        )}

        {temDoCalendario && temSemData && (
          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1.5 text-sm font-semibold">
              Dia das tarefas e grupos sem data
            </legend>
            <Controller
              control={control}
              name="data"
              render={({ field }) => (
                <EscolhaDoDia hoje={hoje} data={field.value} onEscolher={field.onChange} />
              )}
            />
          </fieldset>
        )}
        {temDoCalendario && (
          <CampoDeCategoria
            control={control}
            nome="grupo"
            tipo="grupo"
            legenda="Categoria das tarefas e grupos"
            daOrigem={categoriasDoRascunho([...rascunho.tarefas, ...rascunho.grupos])}
          />
        )}
        {rascunho.procedimentos.length > 0 && (
          <CampoDeCategoria
            control={control}
            nome="procedimento"
            tipo="procedimento"
            legenda="Categoria dos procedimentos"
            daOrigem={categoriasDoRascunho(rascunho.procedimentos)}
          />
        )}

        {duplicados.size > 0 && (
          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1.5 text-sm font-semibold">
              {duplicados.size === 1 ? '1 item já existe' : `${duplicados.size} itens já existem`}
            </legend>
            <Controller
              control={control}
              name="acao"
              render={({ field }) => (
                <div className="flex flex-col gap-1">
                  {(Object.keys(ROTULO_DA_ACAO) as AcaoParaDuplicado[]).map((opcao) => (
                    <label
                      key={opcao}
                      className="flex cursor-pointer items-baseline gap-2 text-[0.9375rem]"
                    >
                      <input
                        type="radio"
                        name={field.name}
                        value={opcao}
                        checked={field.value === opcao}
                        onChange={() => field.onChange(opcao)}
                        className="translate-y-0.5 accent-(--caneta)"
                      />
                      <span>
                        <span className="font-medium">{ROTULO_DA_ACAO[opcao]}</span>{' '}
                        <span className="text-sm text-grafite">{EXPLICACAO_DA_ACAO[opcao]}</span>
                      </span>
                    </label>
                  ))}
                </div>
              )}
            />
          </fieldset>
        )}

        <ListaDaPrevia
          rascunho={rascunho}
          dataPadrao={data}
          duplicados={duplicados}
          desmarcadas={importacao.desmarcadas}
          onMarcar={importacao.handleMarcar}
        />
        <AvisosDaPrevia avisos={rascunho.avisos} ignorados={rascunho.ignorados} />
      </form>
      <RodapeDaEtapa erro={importacao.erro}>
        <Button variant="ghost" onClick={importacao.handleVoltar}>
          Voltar
        </Button>
        <Button
          type="submit"
          form={idFormulario}
          disabled={quantidade === 0 || formState.isSubmitting || importacao.isGravando}
        >
          {quantidade === 1 ? 'Importar 1 item' : `Importar ${quantidade} itens`}
        </Button>
      </RodapeDaEtapa>
    </>
  )
}

interface CampoDeCategoriaProps {
  control: Control<OpcoesInput>
  nome: 'grupo' | 'procedimento'
  tipo: TipoCategoria
  legenda: string
  /** Nomes de categoria que vieram no arquivo (rótulos, coluna, backup). */
  daOrigem: string[]
}

/** Categoria para tudo de um tipo, ou "usar as que vieram" (criadas se não existirem). */
function CampoDeCategoria({ control, nome, tipo, legenda, daOrigem }: CampoDeCategoriaProps) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-sm font-semibold">{legenda}</legend>
      <Controller
        control={control}
        name={nome}
        render={({ field }) => (
          <div className="flex flex-col gap-2">
            {!field.value.isDaOrigem && (
              <CampoCategoria
                tipo={tipo}
                rotulo={legenda}
                atual={{
                  categoryId: field.value.categoryId || undefined,
                  subcategoryId: field.value.subcategoryId || undefined,
                }}
                onEscolher={({ categoryId, subcategoryId }) =>
                  field.onChange({
                    ...field.value,
                    categoryId: categoryId ?? '',
                    subcategoryId: subcategoryId ?? '',
                  })
                }
                className="max-w-72"
              />
            )}
            {daOrigem.length > 0 && (
              <label className="flex cursor-pointer items-start gap-2 text-[0.9375rem]">
                <Checkbox
                  checked={field.value.isDaOrigem}
                  onCheckedChange={(marcada) =>
                    field.onChange({ ...field.value, isDaOrigem: marcada === true })
                  }
                  className="mt-0.5"
                />
                <span>
                  Usar as categorias que vieram{' '}
                  <span className="text-sm text-grafite">
                    ({daOrigem.join(', ')}; as que não existem são criadas)
                  </span>
                </span>
              </label>
            )}
          </div>
        )}
      />
    </fieldset>
  )
}
