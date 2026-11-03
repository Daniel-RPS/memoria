import { useId } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Backup } from '@/lib/backup'
import {
  categoriasDoBackup,
  PARTES_DO_BACKUP,
  ROTULO_DA_PARTE,
  type EscolhaDoBackup,
} from '@/lib/importar/memoria'

const TODAS = 'todas'

interface PartesDoBackupProps {
  backup: Backup
  escolha: EscolhaDoBackup
  onMudar: (escolha: EscolhaDoBackup) => void
}

/** Quais partes do backup trazer e, se quiser, só as de uma categoria. */
export function PartesDoBackup({ backup, escolha, onMudar }: PartesDoBackupProps) {
  const idCategoria = useId()
  const categorias = categoriasDoBackup(backup)
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1.5 text-sm font-semibold">O que trazer do backup</legend>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {PARTES_DO_BACKUP.map((parte) => (
          <label key={parte} className="flex cursor-pointer items-center gap-2 text-[0.9375rem]">
            <Checkbox
              checked={escolha.partes.includes(parte)}
              onCheckedChange={(marcada) =>
                onMudar({
                  ...escolha,
                  partes: marcada
                    ? PARTES_DO_BACKUP.filter(
                        (outra) => outra === parte || escolha.partes.includes(outra),
                      )
                    : escolha.partes.filter((outra) => outra !== parte),
                })
              }
            />
            {ROTULO_DA_PARTE[parte]}
          </label>
        ))}
      </div>
      {categorias.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor={idCategoria} className="text-sm text-grafite">
            Só da categoria
          </label>
          <Select
            value={escolha.categoria ?? TODAS}
            onValueChange={(valor) =>
              onMudar({ ...escolha, categoria: valor === TODAS ? undefined : valor })
            }
          >
            <SelectTrigger id={idCategoria} className="min-w-48 bg-papel">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODAS}>Todas</SelectItem>
              {categorias.map((nome) => (
                <SelectItem key={nome} value={nome}>
                  {nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </fieldset>
  )
}
