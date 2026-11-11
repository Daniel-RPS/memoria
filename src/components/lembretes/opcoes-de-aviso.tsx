import { useEffect, useId, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, X } from 'lucide-react'
import { cn } from 'cn'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import type { DataLocal } from '@/db/types'
import { normalizarHorario } from '@/domain/horario'
import {
  ANTECEDENCIAS_PRONTAS,
  minutosDaAntecedencia,
  momentoDoAviso,
  rotuloDaAntecedencia,
  textoDeQuandoAvisa,
} from '@/domain/lembretes'

/** De quanto em quanto tempo o "avisa hoje às…"/"já passou" se atualiza com o popup aberto. */
const ATUALIZAR_AGORA_MS = 30_000

interface OpcoesDeAvisoProps {
  /** Dia do evento. */
  data: DataLocal
  /** `HH:mm` do evento; sem ele as opções ficam desabilitadas. */
  horario?: string
  /** Antecedências marcadas, em minutos. */
  selecionadas: number[]
  onMudarSelecionadas: (antecedencias: number[]) => void
  /** Horário definido no campo do topo (passa a ser o horário da tarefa). */
  onDefinirHorario: (horario: string) => void
  /** Nome da tarefa para o leitor de tela. */
  titulo?: string
}

/**
 * Conteúdo do popup de avisos, o mesmo na captura, nos menus ⋯, no chip do sino e na aba
 * Notificações: o horário em primeiro (sem ele não há aviso), as opções marcáveis juntas, com
 * quando cada uma avisa, e "Personalizar" para Dias/Horas/Minutos. Sem `<form>`: dentro da
 * captura rápida o envio subiria até o formulário dela.
 */
export function OpcoesDeAviso({
  data,
  horario,
  selecionadas,
  onMudarSelecionadas,
  onDefinirHorario,
  titulo,
}: OpcoesDeAvisoProps) {
  const agora = useAgora()
  const [personalizadas, setPersonalizadas] = useState<number[]>(() =>
    selecionadas.filter((minutos) => !isPronta(minutos)),
  )
  const [isPersonalizando, setIsPersonalizando] = useState(false)
  const marcadas = new Set(selecionadas)
  const opcoes = [
    ...ANTECEDENCIAS_PRONTAS,
    ...[...new Set([...personalizadas, ...selecionadas.filter((m) => !isPronta(m))])].sort(
      (a, b) => a - b,
    ),
  ]

  function alternar(minutos: number, isMarcada: boolean) {
    onMudarSelecionadas(
      isMarcada ? [...selecionadas, minutos] : selecionadas.filter((m) => m !== minutos),
    )
  }

  function handleAdicionar(minutos: number) {
    setPersonalizadas((atuais) => (atuais.includes(minutos) ? atuais : [...atuais, minutos]))
    if (!marcadas.has(minutos)) onMudarSelecionadas([...selecionadas, minutos])
    setIsPersonalizando(false)
  }

  function handleRemover(minutos: number) {
    setPersonalizadas((atuais) => atuais.filter((m) => m !== minutos))
    onMudarSelecionadas(selecionadas.filter((m) => m !== minutos))
  }

  return (
    <div className="flex flex-col gap-3" data-opcoes-de-aviso="">
      <CampoHorarioDoAviso
        // Horário mudou por fora (ou foi definido aqui): o campo recomeça com ele.
        key={horario ?? ''}
        horario={horario}
        titulo={titulo}
        onDefinir={onDefinirHorario}
      />
      {!horario && (
        <p className="-mt-1 text-xs text-grafite">Defina o horário para ativar os avisos</p>
      )}
      <fieldset disabled={!horario} className="flex flex-col gap-0.5">
        <legend className="mb-1 text-sm font-medium text-tinta">Avisar</legend>
        {opcoes.map((minutos) => {
          const momento = horario ? momentoDoAviso(data, horario, minutos) : undefined
          const isPassou = momento !== undefined && momento.getTime() <= agora.getTime()
          const isMarcada = marcadas.has(minutos)
          return (
            <LinhaDaOpcao
              key={minutos}
              rotulo={rotuloDaAntecedencia(minutos)}
              quando={momento ? textoDeQuandoAvisa(momento, agora) : undefined}
              isMarcada={isMarcada}
              // Já passou: não dá para marcar; marcada, ainda dá para desmarcar.
              isDesabilitada={!horario || (isPassou && !isMarcada)}
              onAlternar={(marcada) => alternar(minutos, marcada)}
              onRemover={isPronta(minutos) ? undefined : () => handleRemover(minutos)}
            />
          )
        })}
      </fieldset>
      {isPersonalizando ? (
        <FormularioPersonalizado
          isDesabilitado={!horario}
          onAdicionar={handleAdicionar}
          onCancelar={() => setIsPersonalizando(false)}
        />
      ) : (
        <button
          type="button"
          disabled={!horario}
          onClick={() => setIsPersonalizando(true)}
          className="-mx-1 flex items-center gap-1.5 self-start rounded-md px-1 py-0.5 text-sm font-medium text-caneta outline-none hover:text-tinta focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
        >
          <Plus aria-hidden className="size-3.5" /> Personalizar
        </button>
      )}
    </div>
  )
}

function isPronta(minutos: number) {
  return (ANTECEDENCIAS_PRONTAS as readonly number[]).includes(minutos)
}

/** `new Date()` que se renova com o popup aberto. */
function useAgora() {
  const [agora, setAgora] = useState(() => new Date())
  useEffect(() => {
    const intervalo = window.setInterval(() => setAgora(new Date()), ATUALIZAR_AGORA_MS)
    return () => window.clearInterval(intervalo)
  }, [])
  return agora
}

interface CampoHorarioDoAvisoProps {
  horario?: string
  titulo?: string
  onDefinir: (horario: string) => void
}

/** O primeiro passo: horário da tarefa ("930" vira 09:30; Enter confirma). Foco se faltar. */
function CampoHorarioDoAviso({ horario, titulo, onDefinir }: CampoHorarioDoAvisoProps) {
  const id = useId()
  const [texto, setTexto] = useState(horario ?? '')
  const [hasErro, setHasErro] = useState(false)

  function handleConfirmar() {
    if (texto.trim() === '' && !horario) return
    const normalizado = normalizarHorario(texto)
    if (!normalizado) {
      setHasErro(true)
      return
    }
    setTexto(normalizado)
    if (normalizado !== horario) onDefinir(normalizado)
  }

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-tinta">
        Horário
      </label>
      <div className="flex items-center gap-2">
        <Input
          id={id}
          autoFocus={!horario}
          value={texto}
          onChange={(evento) => {
            setTexto(evento.target.value)
            setHasErro(false)
          }}
          onKeyDown={(evento) => {
            if (evento.key !== 'Enter' || evento.nativeEvent.isComposing) return
            evento.preventDefault()
            handleConfirmar()
          }}
          onBlur={() => {
            if (texto.trim() !== '' && normalizarHorario(texto)) handleConfirmar()
          }}
          placeholder="09:00"
          inputMode="numeric"
          autoComplete="off"
          maxLength={5}
          aria-label={titulo ? `Horário de ${titulo}` : 'Horário da tarefa'}
          aria-invalid={hasErro || undefined}
          className="h-8 w-24 tabular-nums"
        />
        {texto !== (horario ?? '') && (
          <Button type="button" size="sm" variant="secondary" onClick={handleConfirmar}>
            Definir
          </Button>
        )}
      </div>
      {hasErro && <p className="text-xs text-destructive">Use um horário entre 00:00 e 23:59.</p>}
    </div>
  )
}

interface LinhaDaOpcaoProps {
  rotulo: string
  quando?: string
  isMarcada: boolean
  isDesabilitada: boolean
  onAlternar: (isMarcada: boolean) => void
  onRemover?: () => void
}

function LinhaDaOpcao({
  rotulo,
  quando,
  isMarcada,
  isDesabilitada,
  onAlternar,
  onRemover,
}: LinhaDaOpcaoProps) {
  const id = useId()
  return (
    <div
      className={cn(
        'group/opcao flex items-start gap-2.5 rounded-md px-1.5 py-1.5 hover:bg-accent/60',
        isDesabilitada && 'opacity-55 hover:bg-transparent',
      )}
    >
      <Checkbox
        id={id}
        checked={isMarcada}
        disabled={isDesabilitada}
        onCheckedChange={(marcada) => onAlternar(marcada === true)}
        className="mt-0.5"
      />
      <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer leading-tight">
        <span className="block text-sm text-tinta">{rotulo}</span>
        {quando && (
          <span
            className={cn(
              'block text-xs tabular-nums',
              quando === 'já passou' ? 'text-grafite' : 'text-grafite/90',
            )}
          >
            {quando}
          </span>
        )}
      </label>
      {onRemover && (
        <button
          type="button"
          aria-label={`Remover ${rotulo}`}
          onClick={onRemover}
          className="flex size-6 shrink-0 items-center justify-center rounded-md text-grafite outline-none hover:bg-accent hover:text-tinta focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <X aria-hidden className="size-3.5" />
        </button>
      )}
    </div>
  )
}

const numeroDoCampo = z
  .string()
  .trim()
  .regex(/^\d*$/, 'Use só números.')
  .transform((texto) => (texto === '' ? 0 : Number(texto)))

const esquemaPersonalizado = z
  .object({ dias: numeroDoCampo, horas: numeroDoCampo, minutos: numeroDoCampo })
  .transform((partes, contexto) => {
    const resultado = minutosDaAntecedencia(partes)
    if (!resultado.isValida) {
      contexto.addIssue({ code: 'custom', message: resultado.mensagem, path: ['minutos'] })
      return z.NEVER
    }
    return resultado.minutos
  })

type PersonalizadoInput = z.input<typeof esquemaPersonalizado>

interface FormularioPersonalizadoProps {
  isDesabilitado: boolean
  onAdicionar: (minutos: number) => void
  onCancelar: () => void
}

/** Dias, Horas e Minutos + "Adicionar" (1 minuto a 365 dias). */
function FormularioPersonalizado({
  isDesabilitado,
  onAdicionar,
  onCancelar,
}: FormularioPersonalizadoProps) {
  const id = useId()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PersonalizadoInput, unknown, number>({
    resolver: zodResolver(esquemaPersonalizado),
    defaultValues: { dias: '', horas: '', minutos: '' },
  })
  const erro = errors.minutos?.message ?? errors.horas?.message ?? errors.dias?.message
  const adicionar = () => void handleSubmit(onAdicionar)()

  const campos = [
    { nome: 'dias', rotulo: 'Dias' },
    { nome: 'horas', rotulo: 'Horas' },
    { nome: 'minutos', rotulo: 'Minutos' },
  ] as const

  return (
    <div
      className="flex flex-col gap-2 rounded-md border border-pauta p-2"
      onKeyDown={(evento) => {
        if (evento.key !== 'Enter' || evento.nativeEvent.isComposing) return
        evento.preventDefault()
        adicionar()
      }}
    >
      <div className="grid grid-cols-3 gap-2">
        {campos.map((campo, indice) => (
          <div key={campo.nome} className="flex flex-col gap-0.5">
            <label htmlFor={`${id}-${campo.nome}`} className="text-xs text-grafite">
              {campo.rotulo}
            </label>
            <Input
              id={`${id}-${campo.nome}`}
              autoFocus={indice === 0}
              inputMode="numeric"
              autoComplete="off"
              placeholder="0"
              maxLength={campo.nome === 'dias' ? 3 : 4}
              disabled={isDesabilitado}
              aria-invalid={erro ? true : undefined}
              className="h-8 tabular-nums"
              {...register(campo.nome)}
            />
          </div>
        ))}
      </div>
      {erro && (
        <p role="alert" className="text-xs text-destructive">
          {erro}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="ghost" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button type="button" size="sm" onClick={adicionar} disabled={isDesabilitado}>
          Adicionar
        </Button>
      </div>
    </div>
  )
}
