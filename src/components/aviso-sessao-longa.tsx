import { useState, type FormEvent } from 'react'
import { format } from 'date-fns'
import { useLiveQuery } from 'dexie-react-hooks'
import { Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  ajustarFimDaSessao,
  calcularFimAjustado,
  carregarDadosDeTempo,
  encontrarSessoesLongas,
  type AvisoSessaoLonga as DadosAvisoSessaoLonga,
} from '@/domain/tempo'
import { ErroDeValidacao } from '@/lib/erros'

/**
 * Toast discreto exibido quando há uma sessão em andamento há 4h ou mais (ou que virou a
 * meia-noite). Oferece "Manter" (continua rodando sem incomodar) e "Ajustar…" (abre um campo
 * para corrigir o horário de fim e encerrar a sessão).
 */
export function AvisoSessaoLonga() {
  const [dispensadas, setDispensadas] = useState<Set<string>>(() => new Set())
  const [ajustando, setAjustando] = useState<DadosAvisoSessaoLonga | null>(null)
  const [horarioFim, setHorarioFim] = useState('')
  const [erro, setErro] = useState<string | null>(null)

  const avisos = useLiveQuery(async () => {
    const dados = await carregarDadosDeTempo()
    return encontrarSessoesLongas(dados, new Date().toISOString())
  }, [])

  const avisoAtivo = avisos?.find((aviso) => !dispensadas.has(aviso.sessaoId))

  function handleManter(sessaoId: string) {
    setDispensadas((atual) => new Set(atual).add(sessaoId))
  }

  function handleAbrirAjuste(aviso: DadosAvisoSessaoLonga) {
    const umaHoraDepois = new Date(new Date(aviso.inicio).getTime() + 60 * 60 * 1000)
    setHorarioFim(format(umaHoraDepois, 'HH:mm'))
    setErro(null)
    setAjustando(aviso)
  }

  async function handleSalvarAjuste(evento: FormEvent) {
    evento.preventDefault()
    if (!ajustando) return
    try {
      const fimIso = calcularFimAjustado(ajustando.inicio, horarioFim)
      await ajustarFimDaSessao(ajustando.sessaoId, fimIso)
      setDispensadas((atual) => new Set(atual).add(ajustando.sessaoId))
      setAjustando(null)
    } catch (err) {
      setErro(err instanceof ErroDeValidacao ? err.message : 'Horário inválido.')
    }
  }

  return (
    <>
      {avisoAtivo && !ajustando && (
        <div
          data-aviso-sessao-longa=""
          aria-live="polite"
          className="fixed right-4 bottom-4 z-40 flex max-w-md flex-wrap items-center gap-3 rounded-lg border border-pauta bg-papel px-3.5 py-2.5 text-sm text-tinta shadow-lg"
        >
          <Clock aria-hidden className="size-4 shrink-0 text-caneta" />
          <span className="min-w-0 flex-1">{avisoAtivo.mensagem}</span>
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleManter(avisoAtivo.sessaoId)}
            >
              Manter
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleAbrirAjuste(avisoAtivo)}
            >
              Ajustar…
            </Button>
          </div>
        </div>
      )}

      <Dialog open={ajustando !== null} onOpenChange={(aberto) => !aberto && setAjustando(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Ajustar horário de fim</DialogTitle>
            <DialogDescription>
              {ajustando && (
                <>
                  “{ajustando.titulo}” começou às {format(new Date(ajustando.inicio), 'HH:mm')} de{' '}
                  {format(new Date(ajustando.inicio), 'dd/MM')}. Informe o horário em que você
                  terminou.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(evento) => void handleSalvarAjuste(evento)} className="grid gap-3">
            <label className="grid gap-1.5 text-sm font-medium text-tinta">
              <span>Horário de fim</span>
              <Input
                type="time"
                aria-label="Horário de fim"
                value={horarioFim}
                onChange={(evento) => {
                  setHorarioFim(evento.target.value)
                  setErro(null)
                }}
                required
              />
            </label>
            {erro && <p className="text-xs text-destructive">{erro}</p>}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setAjustando(null)}>
                Cancelar
              </Button>
              <Button type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
