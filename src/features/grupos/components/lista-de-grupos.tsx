import { useState } from 'react'
import { IconeDaEntidade } from '@/components/icones/icone-da-entidade'
import { AcoesDasSecoes, SecaoRecolhivel } from '@/components/secao-recolhivel'
import { useCorDeTraco, useCorNaTela } from '@/hooks/use-cor-na-tela'
import { useSecoesRecolhidas } from '@/hooks/use-secoes-recolhidas'
import type { BlocoDeGrupos } from '@/lib/grupos'
import { CartaoDoGrupo } from '@/features/grupos/components/cartao-do-grupo'

interface ListaDeGruposProps {
  blocos: BlocoDeGrupos[]
  /** Busca ativa: os blocos abrem sozinhos, sem mudar o estado salvo. */
  isFiltrando: boolean
}

const idDoBloco = ({ categoria }: BlocoDeGrupos) => categoria?.id ?? 'sem-categoria'

/** Um bloco recolhível por categoria, com os grupos em cartões que abrem o conteúdo. */
export function ListaDeGrupos({ blocos, isFiltrando }: ListaDeGruposProps) {
  const corNaTela = useCorNaTela()
  const corDeTraco = useCorDeTraco()
  const secoes = useSecoesRecolhidas('grupos', isFiltrando)
  // Cartões abertos: só em memória enquanto a tela está aberta; todos começam fechados.
  const [abertos, setAbertos] = useState<ReadonlySet<string>>(() => new Set())

  function handleAlternarCartao(seriesId: string) {
    setAbertos((atuais) => {
      const novos = new Set(atuais)
      if (!novos.delete(seriesId)) novos.add(seriesId)
      return novos
    })
  }
  const ids = blocos.map(idDoBloco)

  if (blocos.length === 0) return null
  return (
    <div className="flex flex-col gap-6">
      <AcoesDasSecoes
        isTudoAberto={ids.every(secoes.isAberta)}
        isTudoRecolhido={!ids.some(secoes.isAberta)}
        onExpandirTudo={() => secoes.handleExpandirTudo(ids)}
        onRecolherTudo={() => secoes.handleRecolherTudo(ids)}
      />
      {blocos.map((bloco) => {
        const { categoria, grupos } = bloco
        const id = idDoBloco(bloco)
        const cor = categoria ? corNaTela(categoria.cor) : null
        return (
          <SecaoRecolhivel
            key={id}
            titulo={categoria?.nome ?? 'Sem categoria'}
            cor={cor}
            icone={categoria?.icone && <IconeDaEntidade icone={categoria.icone} tamanho="lg" />}
            contagem={grupos.length}
            isAberta={secoes.isAberta(id)}
            onAlternar={() => secoes.handleAlternar(id)}
          >
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(17rem,1fr))] items-start gap-3">
              {grupos.map((grupo) => (
                <CartaoDoGrupo
                  key={grupo.serie.id}
                  grupo={grupo}
                  cor={categoria ? corDeTraco(categoria.cor) : 'var(--grafite)'}
                  isAberto={abertos.has(grupo.serie.id)}
                  onAlternar={() => handleAlternarCartao(grupo.serie.id)}
                />
              ))}
            </ul>
          </SecaoRecolhivel>
        )
      })}
    </div>
  )
}
