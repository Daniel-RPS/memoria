import type { ReactNode } from 'react'
import { CalendarPlus } from 'lucide-react'
import { cn } from 'cn'
import { Checkbox } from '@/components/ui/checkbox'
import type { Task } from '@/db/types'
import { useCategoriasDoContexto } from '@/hooks/contexto-categorias'
import { useCorNaTela } from '@/hooks/use-cor-na-tela'
import { classificarTarefa } from '@/lib/categorias'
import { textoHaDias } from '@/lib/inicio'

interface LinhaMarcavelProps {
  titulo: string
  isFeita: boolean
  onMarcar: (isFeita: boolean) => void
  /** Selo que acompanha o texto, na mesma linha dele (ex.: "há X dias"). */
  selo?: ReactNode
  /** Ponto da categoria e ações: à direita do texto. */
  children?: ReactNode
}

/** Linha com caixinha dos cards do Início; texto longo quebra a linha, nada é cortado. */
export function LinhaMarcavel({ titulo, isFeita, onMarcar, selo, children }: LinhaMarcavelProps) {
  return (
    <li className="group/linha flex min-h-7 items-start gap-2 py-1 text-sm leading-5">
      <Checkbox
        checked={isFeita}
        aria-label={titulo}
        onCheckedChange={(marcado) => onMarcar(marcado === true)}
        className="mt-0.5"
      />
      <span className="min-w-0 flex-1 break-words">
        <span className={cn(isFeita && 'text-grafite line-through')}>{titulo}</span>
        {selo}
      </span>
      {children}
    </li>
  )
}

export function PontoDaCategoria({ dono }: { dono: Pick<Task, 'categoryId' | 'subcategoryId'> }) {
  const classificacao = classificarTarefa(dono, useCategoriasDoContexto())
  const corNaTela = useCorNaTela()
  if (!classificacao) return null
  return (
    <span
      aria-hidden
      title={classificacao.rotulo}
      className="mt-[0.4375rem] size-1.5 shrink-0 rounded-full"
      style={{ backgroundColor: corNaTela(classificacao.cor) }}
    />
  )
}

/** Selo "há X dias" de um pendente que ficou para trás. */
export function SeloHaDias({ dias }: { dias: number }) {
  return (
    <span className="ml-1.5 inline-block rounded-sm bg-marca-texto px-1.5 align-[0.0625rem] text-xs leading-[1.125rem] whitespace-nowrap text-violeta-profundo">
      {textoHaDias(dias)}
    </span>
  )
}

interface BotaoTrazerProps {
  /** Nome acessível, ex.: "Trazer Renovar CNH para hoje". */
  rotulo: string
  /** Texto da dica ao passar o mouse. */
  dica?: string
  onTrazer: () => void
  /** Grupo nomeado do Tailwind que revela o botão no hover (`linha` ou `grupo`). */
  revelarCom: 'linha' | 'grupo'
}

/** "Trazer para hoje": aparece ao passar o mouse ou com foco. */
export function BotaoTrazer({
  rotulo,
  dica = 'Trazer para hoje',
  onTrazer,
  revelarCom,
}: BotaoTrazerProps) {
  return (
    <button
      type="button"
      aria-label={rotulo}
      title={dica}
      onClick={onTrazer}
      className={cn(
        '-my-0.5 flex size-6 shrink-0 items-center justify-center rounded text-grafite opacity-0 hover:bg-accent hover:text-tinta focus-visible:opacity-100',
        revelarCom === 'linha'
          ? 'group-focus-within/linha:opacity-100 group-hover/linha:opacity-100'
          : 'group-focus-within/grupo:opacity-100 group-hover/grupo:opacity-100',
      )}
    >
      <CalendarPlus aria-hidden className="size-3.5" />
    </button>
  )
}
