import { useState, type ReactNode } from 'react'
import { EmojiPicker } from 'frimousse'
import { Ban, Search } from 'lucide-react'
import { cn } from 'cn'
import { IconeDaEntidade } from '@/components/icones/icone-da-entidade'
import { useIndiceDeMarcas } from '@/components/icones/indice-de-marcas'
import { useIconesRecentes } from '@/components/icones/use-icones-recentes'
import type { Icone } from '@/db/types'
import { buscarMarcas, MARCAS_SUGERIDAS, type MarcaDoIndice } from '@/lib/icones'

type Aba = 'emoji' | 'marca'

const BUSCA =
  'h-9 w-full rounded-md border border-pauta bg-papel pr-2 pl-8 text-sm outline-none placeholder:text-grafite focus-visible:border-caneta focus-visible:ring-3 focus-visible:ring-ring/50'
const CELULA =
  'flex size-9 items-center justify-center rounded-md outline-none hover:bg-accent focus-visible:bg-accent focus-visible:ring-2 focus-visible:ring-caneta data-[active]:bg-accent'
const TITULO_DE_SECAO = 'px-1 pt-2 pb-1 text-xs font-semibold text-grafite'

interface PainelIconesProps {
  atual?: Icone
  onEscolher: (icone: Icone | undefined) => void
}

/** Conteúdo do seletor de ícones: abas Emoji e Marcas, recentes e "Sem ícone". */
export function PainelIcones({ atual, onEscolher }: PainelIconesProps) {
  const [aba, setAba] = useState<Aba>(atual?.tipo ?? 'emoji')
  const { recentes, handleUsado } = useIconesRecentes()
  const recentesDaAba = recentes.filter((icone) => icone.tipo === aba)

  function handleEscolher(icone: Icone) {
    handleUsado(icone)
    onEscolher(icone)
  }

  return (
    <div className="flex flex-col">
      <div
        role="tablist"
        aria-label="Tipo de ícone"
        className="flex gap-1 border-b border-pauta p-1.5"
      >
        {(
          [
            ['emoji', 'Emoji'],
            ['marca', 'Marcas'],
          ] as const
        ).map(([valor, rotulo]) => (
          <button
            key={valor}
            type="button"
            role="tab"
            aria-selected={aba === valor}
            onClick={() => setAba(valor)}
            className={cn(
              'h-7 flex-1 rounded-[5px] text-sm text-grafite outline-none hover:text-tinta focus-visible:ring-2 focus-visible:ring-caneta',
              aba === valor && 'bg-caneta text-primary-foreground hover:text-primary-foreground',
            )}
          >
            {rotulo}
          </button>
        ))}
      </div>

      <div role="tabpanel" aria-label={aba === 'emoji' ? 'Emoji' : 'Marcas'} className="p-2">
        {recentesDaAba.length > 0 && (
          <Recentes icones={recentesDaAba} onEscolher={handleEscolher} />
        )}
        {aba === 'emoji' ? (
          <AbaEmoji onEscolher={(emoji) => handleEscolher({ tipo: 'emoji', valor: emoji })} />
        ) : (
          <AbaMarcas onEscolher={(slug) => handleEscolher({ tipo: 'marca', valor: slug })} />
        )}
      </div>

      {atual && (
        <button
          type="button"
          onClick={() => onEscolher(undefined)}
          className="flex h-9 items-center justify-center gap-1.5 border-t border-pauta text-sm text-grafite outline-none hover:bg-accent hover:text-tinta focus-visible:bg-accent"
        >
          <Ban aria-hidden className="size-3.5" /> Sem ícone
        </button>
      )}
    </div>
  )
}

function Recentes({ icones, onEscolher }: { icones: Icone[]; onEscolher: (icone: Icone) => void }) {
  return (
    <section aria-label="Usados recentemente" className="mb-1">
      <h3 className={TITULO_DE_SECAO}>Usados recentemente</h3>
      <div className="flex flex-wrap">
        {icones.map((icone) => (
          <BotaoDeIcone
            key={`${icone.tipo}:${icone.valor}`}
            icone={icone}
            onEscolher={onEscolher}
          />
        ))}
      </div>
    </section>
  )
}

function BotaoDeIcone({ icone, onEscolher }: { icone: Icone; onEscolher: (icone: Icone) => void }) {
  return (
    <button type="button" className={CELULA} onClick={() => onEscolher(icone)}>
      <IconeDaEntidade icone={icone} tamanho="lg" isDecorativo={false} />
    </button>
  )
}

function CampoDeBusca(props: { children: ReactNode }) {
  return (
    <label className="relative block">
      <Search
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-grafite"
      />
      {props.children}
    </label>
  )
}

/** Emojis em português (dados do Emojibase servidos pelo app), com busca e categorias. */
function AbaEmoji({ onEscolher }: { onEscolher: (emoji: string) => void }) {
  return (
    <EmojiPicker.Root
      locale="pt"
      emojibaseUrl={`${import.meta.env.BASE_URL}emojibase`}
      columns={8}
      onEmojiSelect={({ emoji }) => onEscolher(emoji)}
      className="flex h-80 flex-col gap-1"
    >
      <CampoDeBusca>
        <span className="sr-only">Buscar emoji</span>
        <EmojiPicker.Search
          autoFocus
          placeholder="Buscar emoji (ex.: casa, festa)"
          className={BUSCA}
        />
      </CampoDeBusca>
      <EmojiPicker.Viewport className="relative flex-1 outline-none">
        <EmojiPicker.Loading className="absolute inset-0 flex items-center justify-center text-sm text-grafite">
          Carregando emojis…
        </EmojiPicker.Loading>
        <EmojiPicker.Empty className="absolute inset-0 flex items-center justify-center text-sm text-grafite">
          Nenhum emoji encontrado.
        </EmojiPicker.Empty>
        <EmojiPicker.List
          className="pb-1 select-none"
          components={{
            CategoryHeader: ({ category, ...props }) => (
              <div {...props} className={cn(TITULO_DE_SECAO, 'bg-popover')}>
                {category.label}
              </div>
            ),
            Row: ({ children, ...props }) => (
              <div {...props} className="flex">
                {children}
              </div>
            ),
            Emoji: ({ emoji, ...props }) => (
              <button
                {...props}
                aria-label={emoji.label}
                title={emoji.label}
                className={cn(CELULA, 'text-xl leading-none')}
              >
                {emoji.emoji}
              </button>
            ),
          }}
        />
      </EmojiPicker.Viewport>
    </EmojiPicker.Root>
  )
}

/** Marcas do Simple Icons: sugeridas antes de digitar; com busca, qualquer uma da biblioteca. */
function AbaMarcas({ onEscolher }: { onEscolher: (slug: string) => void }) {
  const indice = useIndiceDeMarcas()
  const [termo, setTermo] = useState('')
  const [emFoco, setEmFoco] = useState<MarcaDoIndice | null>(null)

  const sugeridas = MARCAS_SUGERIDAS.flatMap((slug) => indice?.porSlug.get(slug) ?? [])
  const marcas = termo.trim() ? buscarMarcas(indice?.lista ?? [], termo) : sugeridas

  return (
    <div className="flex h-80 flex-col gap-1">
      <CampoDeBusca>
        <span className="sr-only">Buscar marca</span>
        <input
          type="search"
          autoFocus
          value={termo}
          onChange={(evento) => setTermo(evento.target.value)}
          placeholder={
            indice
              ? `Buscar entre ${indice.lista.length.toLocaleString('pt-BR')} marcas`
              : 'Buscar marca'
          }
          className={BUSCA}
        />
      </CampoDeBusca>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {!indice && <p className="py-8 text-center text-sm text-grafite">Carregando marcas…</p>}
        {indice && !termo.trim() && <h3 className={TITULO_DE_SECAO}>Sugestões</h3>}
        {indice && marcas.length === 0 && (
          <p className="py-8 text-center text-sm text-grafite">Nenhuma marca com “{termo}”.</p>
        )}
        <div className="grid grid-cols-8">
          {marcas.map((marca) => (
            <button
              key={marca.s}
              type="button"
              aria-label={marca.t}
              title={marca.t}
              className={CELULA}
              onClick={() => onEscolher(marca.s)}
              onMouseEnter={() => setEmFoco(marca)}
              onFocus={() => setEmFoco(marca)}
            >
              <IconeDaEntidade icone={{ tipo: 'marca', valor: marca.s }} tamanho="lg" />
            </button>
          ))}
        </div>
      </div>
      <p aria-hidden className="h-5 truncate px-1 text-xs text-grafite">
        {emFoco?.t ?? 'Simple Icons (CC0). Marcas são de seus donos.'}
      </p>
    </div>
  )
}
