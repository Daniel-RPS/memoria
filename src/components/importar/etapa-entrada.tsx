import { useId, useRef } from 'react'
import { FileUp, LoaderCircle } from 'lucide-react'
import { cn } from 'cn'
import { RodapeDaEtapa } from '@/components/importar/rodape-da-etapa'
import type { useImportacao } from '@/components/importar/use-importacao'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ORIGENS } from '@/lib/importar/entrada'
import type { ConteudoDoTexto } from '@/lib/importar/markdown'

const CONTEUDOS: { id: ConteudoDoTexto; rotulo: string; exemplo: string }[] = [
  {
    id: 'tarefas',
    rotulo: 'Tarefas',
    exemplo:
      '- [ ] Ligar para o dentista\n- [x] Pagar a luz\n  - [ ] Guardar o comprovante\n\n# Mercado\n- [ ] Leite\n- [ ] Pão',
  },
  {
    id: 'procedimento',
    rotulo: 'Procedimento',
    exemplo:
      '# Publicar o site\n1. Rodar os testes\n2. Gerar o build\n   Conferir se não deu erro\n3. Enviar para o GitHub',
  },
  {
    id: 'nota',
    rotulo: 'Nota',
    exemplo: '# Ideias para a viagem\nLevar casaco.\nVer passeios no centro.',
  },
]

const DICA_DO_CONTEUDO: Record<ConteudoDoTexto, string> = {
  tarefas:
    'Cada linha vira uma tarefa; recuo vira subtarefa; “# Nome” com uma lista embaixo vira grupo.',
  procedimento: '“# Título” abre o procedimento; cada item da lista (ou “## Etapa”) é uma etapa.',
  nota: 'O título é a primeira linha (ou “# Título”); o resto é o conteúdo.',
}

/** Etapa 2: colar texto ou escolher arquivos. */
export function EtapaEntrada({ importacao }: { importacao: ReturnType<typeof useImportacao> }) {
  const idTexto = useId()
  const entradaRef = useRef<HTMLInputElement>(null)
  const { origem } = importacao
  if (!origem) return null
  const configuracao = ORIGENS[origem]
  const isTexto = origem === 'texto'
  const exemplo = CONTEUDOS.find((conteudo) => conteudo.id === importacao.conteudoDoTexto)?.exemplo
  const temArquivos =
    importacao.nomesDosArquivos.length > 0 || importacao.arquivosDeTexto.length > 0

  return (
    <>
      <div className="flex min-h-0 flex-col gap-4 overflow-y-auto px-5 py-4">
        <p className="font-semibold">{configuracao.rotulo}</p>

        {isTexto && (
          <div role="group" aria-label="O texto vira" className="flex flex-wrap items-center gap-1">
            <span className="mr-1 text-sm text-grafite">O texto vira</span>
            {CONTEUDOS.map((conteudo) => (
              <button
                key={conteudo.id}
                type="button"
                aria-pressed={importacao.conteudoDoTexto === conteudo.id}
                onClick={() => importacao.setConteudoDoTexto(conteudo.id)}
                className={cn(
                  'h-8 rounded-full px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                  importacao.conteudoDoTexto === conteudo.id
                    ? 'bg-caneta font-semibold text-primary-foreground'
                    : 'text-grafite hover:bg-accent hover:text-tinta',
                )}
              >
                {conteudo.rotulo}
              </button>
            ))}
          </div>
        )}

        {isTexto && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor={idTexto} className="text-sm font-medium">
              Cole o texto
            </label>
            <Textarea
              id={idTexto}
              value={importacao.texto}
              onChange={(evento) => importacao.setTexto(evento.target.value)}
              placeholder={exemplo}
              spellCheck={false}
              className="min-h-44 bg-papel font-mono text-sm"
            />
            <p className="text-sm text-grafite">{DICA_DO_CONTEUDO[importacao.conteudoDoTexto]}</p>
          </div>
        )}

        <input
          ref={entradaRef}
          type="file"
          accept={configuracao.aceita}
          multiple={configuracao.isVarios}
          aria-label={`Arquivo para ${configuracao.rotulo}`}
          className="sr-only"
          onChange={(evento) => {
            const arquivos = [...(evento.target.files ?? [])]
            // Limpa para poder escolher o mesmo arquivo de novo.
            evento.target.value = ''
            importacao.handleArquivos(arquivos)
          }}
        />
        <button
          type="button"
          onClick={() => entradaRef.current?.click()}
          disabled={importacao.isLendo}
          className={cn(
            'flex flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-pauta bg-papel px-4 text-center outline-none hover:border-caneta hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60',
            isTexto ? 'py-4' : 'py-10',
          )}
        >
          {importacao.isLendo ? (
            <LoaderCircle
              aria-hidden
              className="size-5 animate-spin text-violeta-profundo motion-reduce:animate-none"
            />
          ) : (
            <FileUp aria-hidden className="size-5 text-violeta-profundo" />
          )}
          <span className="font-semibold">
            {importacao.isLendo
              ? 'Lendo…'
              : configuracao.isVarios
                ? 'Escolher arquivos'
                : 'Escolher arquivo'}
          </span>
          <span className="text-sm text-grafite">
            ou solte aqui (
            {configuracao.aceita
              .split(',')
              .filter((tipo) => tipo.startsWith('.'))
              .join(', ')}
            )
          </span>
        </button>
        {temArquivos && (
          <p className="text-sm text-grafite">
            Lido: {[...importacao.nomesDosArquivos].join(', ')}
          </p>
        )}
      </div>
      <RodapeDaEtapa erro={importacao.erro}>
        <Button variant="ghost" onClick={importacao.handleVoltar}>
          Voltar
        </Button>
        {(isTexto || temArquivos) && (
          <Button onClick={importacao.handleContinuar} disabled={importacao.isLendo}>
            Ver prévia
          </Button>
        )}
      </RodapeDaEtapa>
    </>
  )
}
