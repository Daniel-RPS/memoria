import { useRef, useState } from 'react'
import { Bell, BellOff, MoreHorizontal, Pencil } from 'lucide-react'
import { Link } from 'react-router'
import { cn } from 'cn'
import { AvisosDoAlvo } from '@/components/lembretes/avisos-da-tarefa'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { GlassCard } from '@/components/ui/glass-card'
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover'
import type { AlvoDetalhado } from '@/db/repositories/lembrete-repository'
import {
  detalheDoAlvo,
  quandoTexto,
  rotuloCurtoDaAntecedencia,
  type LinhaAgendada,
} from '@/domain/lembretes'
import { useRemoverAvisos } from '@/features/notificacoes/hooks/use-remover-avisos'

interface LinhaDaAgendadaProps {
  linha: LinhaAgendada<AlvoDetalhado>
  agora: Date
}

/** Uma tarefa com avisos por vir: título (leva ao dia), detalhe, chips e menu ⋯. */
export function LinhaDaAgendada({ linha, agora }: LinhaDaAgendadaProps) {
  const { alvo } = linha
  const [isEditando, setIsEditando] = useState(false)
  const removerAvisos = useRemoverAvisos()
  const isAbrindoPopupRef = useRef(false)
  const detalhe = detalheDoAlvo(alvo, true)
  const alvoDoHorario = { tipo: alvo.tipo, id: alvo.id }

  return (
    <li>
      <GlassCard className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:gap-4">
        <Link
          to={`/dia/${alvo.data}`}
          className="group/link min-w-0 flex-1 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <span className="block font-semibold break-words text-tinta group-hover/link:underline">
            {alvo.titulo}
          </span>
          {detalhe && (
            <span className="mt-0.5 block text-sm text-grafite tabular-nums">{detalhe}</span>
          )}
          <span className="mt-0.5 block text-xs text-caneta">
            Próximo aviso {quandoTexto(linha.proximoAviso, agora)}
          </span>
        </Link>
        <div className="flex items-center justify-between gap-2 sm:justify-end">
          <ul className="flex flex-wrap gap-1.5" aria-label="Avisos">
            {linha.lembretes.map((lembrete) => {
              const isPorVir = linha.situacoes.get(lembrete.id) === 'agendado'
              return (
                <li
                  key={lembrete.id}
                  title={isPorVir ? undefined : 'Já passou'}
                  className={cn(
                    'flex items-center gap-1 rounded-full px-2 py-0.5 text-xs whitespace-nowrap',
                    isPorVir ? 'bg-accent font-medium text-caneta' : 'text-grafite line-through',
                  )}
                >
                  <Bell aria-hidden className="size-3" />
                  {rotuloCurtoDaAntecedencia(lembrete.antecedenciaMin)}
                </li>
              )
            })}
          </ul>
          <Popover open={isEditando} onOpenChange={setIsEditando}>
            <DropdownMenu modal={false}>
              <PopoverAnchor asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Mais ações para ${alvo.titulo}`}
                    className="shrink-0 text-grafite"
                  >
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
              </PopoverAnchor>
              <DropdownMenuContent
                align="end"
                className="w-auto min-w-44"
                onCloseAutoFocus={(evento) => {
                  if (!isAbrindoPopupRef.current) return
                  evento.preventDefault()
                  isAbrindoPopupRef.current = false
                }}
              >
                <DropdownMenuItem
                  onSelect={() => {
                    isAbrindoPopupRef.current = true
                    setIsEditando(true)
                  }}
                >
                  <Pencil /> Editar avisos
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() =>
                    void removerAvisos(
                      alvoDoHorario,
                      linha.lembretes.map((lembrete) => lembrete.antecedenciaMin),
                    )
                  }
                >
                  <BellOff /> Remover avisos
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <PopoverContent align="end" className="w-72 p-3">
              {isEditando && (
                <AvisosDoAlvo
                  alvo={alvoDoHorario}
                  data={alvo.data}
                  horario={alvo.horario}
                  titulo={alvo.titulo}
                />
              )}
            </PopoverContent>
          </Popover>
        </div>
      </GlassCard>
    </li>
  )
}
