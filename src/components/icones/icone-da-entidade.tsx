import type { CSSProperties } from 'react'
import { Cloud, Package, Server, Shapes, type LucideIcon } from 'lucide-react'
import { cn } from 'cn'
import simboloMemoria from '@/assets/simbolo-memoria.png'
import simboloMemoriaClaro from '@/assets/simbolo-memoria-claro.png'
import { enderecoDaMarca, useIndiceDeMarcas } from '@/components/icones/indice-de-marcas'
import type { Icone } from '@/db/types'
import { useCorDeTraco } from '@/hooks/use-cor-na-tela'
import {
  DICA_DO_GENERICO,
  SLUG_DO_APP,
  nomeDoIcone,
  resolverIcone,
  type IconeGenerico,
} from '@/lib/icones'

const DESENHO_GENERICO: Record<IconeGenerico, LucideIcon> = {
  pacote: Package,
  nuvem: Cloud,
  servidor: Server,
}

const TAMANHOS = {
  /** Linhas de menu e texto miúdo. */
  sm: { caixa: 'size-3.5', emoji: 'text-[0.8rem]' },
  /** Nome de categoria, título de cartão. */
  md: { caixa: 'size-4', emoji: 'text-[0.95rem]' },
  /** Cabeçalho de bloco e título do editor. */
  lg: { caixa: 'size-5', emoji: 'text-lg' },
} as const

interface IconeDaEntidadeProps {
  icone?: Icone
  tamanho?: keyof typeof TAMANHOS
  className?: string
  /** O nome ao lado já diz o que é: o ícone fica fora do leitor de tela. */
  isDecorativo?: boolean
}

/**
 * Ícone escolhido de procedimento ou categoria, antes do título/nome: emoji ou marca (desenho
 * do Simple Icons pintado na cor oficial; cor com pouco contraste no tema é ajustada, como as
 * faixas), símbolo do MemorIA ou ícone genérico. Marca que não existe mais vira um ícone
 * neutro. Sem ícone, não desenha nada.
 */
export function IconeDaEntidade({
  icone,
  tamanho = 'md',
  className,
  isDecorativo = true,
}: IconeDaEntidadeProps) {
  const indice = useIndiceDeMarcas(icone?.tipo === 'marca' && icone.valor !== SLUG_DO_APP)
  const corDeTraco = useCorDeTraco()
  if (!icone) return null

  const resolvido = resolverIcone(icone, indice?.porSlug)
  const medidas = TAMANHOS[tamanho]
  const acessivel = isDecorativo
    ? { 'aria-hidden': true }
    : { role: 'img', 'aria-label': nomeDoIcone(resolvido) }

  if (resolvido.tipo === 'emoji') {
    return (
      <span
        {...acessivel}
        className={cn(
          'inline-flex shrink-0 items-center justify-center leading-none',
          medidas.caixa,
          medidas.emoji,
          className,
        )}
      >
        {resolvido.emoji}
      </span>
    )
  }
  if (resolvido.tipo === 'neutro') {
    return (
      <Shapes
        {...acessivel}
        data-icone-neutro=""
        className={cn('shrink-0 text-grafite', medidas.caixa, className)}
      />
    )
  }
  if (resolvido.tipo === 'generico') {
    const Desenho = DESENHO_GENERICO[resolvido.valor]
    return (
      <span {...acessivel} title={DICA_DO_GENERICO} className="inline-flex shrink-0">
        <Desenho
          data-icone-generico={resolvido.valor}
          className={cn('text-grafite', medidas.caixa, className)}
        />
      </span>
    )
  }
  if (resolvido.tipo === 'app') {
    // Os mesmos recortes do logo da barra, um por tema (o CSS `dark:` mostra o do tema atual).
    return (
      <span
        {...acessivel}
        title={resolvido.nome}
        data-marca={resolvido.slug}
        className={cn('relative inline-block shrink-0', medidas.caixa, className)}
      >
        <img
          src={simboloMemoriaClaro}
          alt=""
          className="absolute inset-0 size-full object-contain dark:invisible"
        />
        <img
          src={simboloMemoria}
          alt=""
          className="invisible absolute inset-0 size-full object-contain dark:visible"
        />
      </span>
    )
  }
  if (resolvido.tipo === 'carregando') {
    return <span aria-hidden className={cn('inline-block shrink-0', medidas.caixa, className)} />
  }
  return (
    <span
      {...acessivel}
      title={resolvido.nome}
      data-marca={resolvido.slug}
      className={cn(
        'inline-block shrink-0 bg-(--cor-da-marca) mask-contain mask-center mask-no-repeat [mask-image:var(--desenho-da-marca)]',
        medidas.caixa,
        className,
      )}
      style={
        {
          '--cor-da-marca': corDeTraco(resolvido.cor),
          '--desenho-da-marca': `url(${enderecoDaMarca(resolvido.slug)})`,
        } as CSSProperties
      }
    />
  )
}
