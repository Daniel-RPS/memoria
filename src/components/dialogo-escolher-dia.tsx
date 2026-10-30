import { ptBR } from 'react-day-picker/locale'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { DataLocal } from '@/db/types'
import { deDataLocal, paraDataLocal, somarDias } from '@/lib/datas'

interface DialogoEscolherDiaProps {
  isAberto: boolean
  onMudarAberto: (isAberto: boolean) => void
  titulo: string
  descricao?: string
  /** Dia mostrado ao abrir (normalmente o dia atual da tarefa). */
  dataInicial: DataLocal
  hoje: DataLocal
  onEscolher: (data: DataLocal) => void
}

/** Calendário para escolher o dia de destino; atalhos para hoje e amanhã. */
export function DialogoEscolherDia({
  isAberto,
  onMudarAberto,
  titulo,
  descricao,
  dataInicial,
  hoje,
  onEscolher,
}: DialogoEscolherDiaProps) {
  function handleEscolher(data: DataLocal) {
    onMudarAberto(false)
    onEscolher(data)
  }

  return (
    <Dialog open={isAberto} onOpenChange={onMudarAberto}>
      <DialogContent className="w-auto max-w-[calc(100%-2rem)]">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          {descricao && <DialogDescription>{descricao}</DialogDescription>}
        </DialogHeader>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleEscolher(hoje)}>
            Hoje
          </Button>
          <Button variant="outline" onClick={() => handleEscolher(somarDias(hoje, 1))}>
            Amanhã
          </Button>
        </div>
        <Calendar
          mode="single"
          locale={ptBR}
          weekStartsOn={1}
          defaultMonth={deDataLocal(dataInicial)}
          selected={deDataLocal(dataInicial)}
          onSelect={(dia) => dia && handleEscolher(paraDataLocal(dia))}
          className="rounded-md border border-pauta"
        />
      </DialogContent>
    </Dialog>
  )
}
