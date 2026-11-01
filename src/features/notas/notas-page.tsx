import { formatDistanceToNow, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Paperclip, Plus, Search } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CabecalhoPagina } from '@/components/cabecalho-pagina'
import { criarNota } from '@/db/repositories/note-repository'
import { descreverQuantidade } from '@/lib/anexos'
import { buscarNotas, tituloDaNota } from '@/lib/notas'
import { useNotas } from '@/features/notas/hooks/use-notas'

const PARAMETRO_BUSCA = 'q'

export function NotasPage() {
  const navigate = useNavigate()
  const [parametros, setParametros] = useSearchParams()
  const termo = parametros.get(PARAMETRO_BUSCA) ?? ''
  const { notas, anexosPorNota, isCarregando } = useNotas()
  const encontradas = buscarNotas(notas, termo)

  async function handleNova() {
    const nota = await criarNota()
    navigate(`/notas/${nota.id}`)
  }

  return (
    <>
      <CabecalhoPagina
        titulo="Notas"
        descricao="Texto livre com fotos, desenhos, áudios e links. Salva sozinha enquanto você escreve."
        acao={
          <Button onClick={() => void handleNova()}>
            <Plus /> Nova nota
          </Button>
        }
      />

      {notas.length > 0 && (
        <label className="relative mt-8 block">
          <span className="sr-only">Buscar notas</span>
          <Search
            aria-hidden
            className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-grafite"
          />
          <Input
            type="search"
            value={termo}
            onChange={(evento) =>
              setParametros(evento.target.value ? { [PARAMETRO_BUSCA]: evento.target.value } : {}, {
                replace: true,
              })
            }
            placeholder="Buscar no título e no texto"
            className="h-10 bg-papel pl-9"
          />
        </label>
      )}

      <section aria-label="Lista de notas" className="mt-4">
        {!isCarregando && notas.length === 0 && (
          <p className="rounded-md border border-pauta bg-papel px-4 py-6 text-grafite">
            Nenhuma nota ainda. Use <strong>Nova nota</strong> para anotar uma ideia, colar uma foto
            ou gravar um lembrete em áudio.
          </p>
        )}
        {notas.length > 0 && encontradas.length === 0 && (
          <p className="px-1 py-4 text-grafite">Nenhuma nota com “{termo}”.</p>
        )}
        {encontradas.length > 0 && (
          <ul className="rounded-md border border-pauta bg-papel">
            {encontradas.map((nota) => {
              const anexos = anexosPorNota.get(nota.id) ?? 0
              return (
                <li key={nota.id} className="border-b border-pauta last:border-b-0">
                  <Link
                    to={`/notas/${nota.id}`}
                    className="block px-4 py-3 hover:bg-accent/50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-caneta"
                  >
                    <span className="font-semibold">{tituloDaNota(nota)}</span>
                    <span className="mt-0.5 flex flex-wrap gap-x-3 text-sm text-grafite">
                      <span>
                        editada{' '}
                        {formatDistanceToNow(parseISO(nota.atualizadoEm), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </span>
                      {anexos > 0 && (
                        <span className="flex items-center gap-1">
                          <Paperclip aria-hidden className="size-3.5" />
                          {descreverQuantidade(anexos)}
                        </span>
                      )}
                    </span>
                    {nota.titulo.trim() && nota.conteudo.trim() && (
                      <span className="mt-1 line-clamp-2 block text-[0.9375rem]">
                        {nota.conteudo}
                      </span>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </>
  )
}
