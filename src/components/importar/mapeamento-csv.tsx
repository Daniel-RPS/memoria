import { useId } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  CAMPOS_DO_CSV,
  ROTULO_DO_CAMPO,
  type CampoDoCsv,
  type MapeamentoDoCsv,
} from '@/lib/importar/csv'

const NAO_USAR = 'nao-usar'

interface MapeamentoCsvProps {
  cabecalho: string[]
  mapeamento: MapeamentoDoCsv
  onMudar: (mapeamento: MapeamentoDoCsv) => void
}

/** Qual coluna do CSV é título, data, categoria, concluída e grupo. */
export function MapeamentoCsv({ cabecalho, mapeamento, onMudar }: MapeamentoCsvProps) {
  const idBase = useId()
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-sm font-semibold">Colunas da planilha</legend>
      <div className="grid gap-x-3 gap-y-2 sm:grid-cols-[auto_1fr_auto_1fr]">
        {CAMPOS_DO_CSV.map((campo: CampoDoCsv) => (
          <div key={campo} className="contents">
            <label htmlFor={`${idBase}-${campo}`} className="self-center text-sm text-grafite">
              {ROTULO_DO_CAMPO[campo]}
            </label>
            <Select
              value={mapeamento[campo] === null ? NAO_USAR : String(mapeamento[campo])}
              onValueChange={(valor) =>
                onMudar({ ...mapeamento, [campo]: valor === NAO_USAR ? null : Number(valor) })
              }
            >
              <SelectTrigger id={`${idBase}-${campo}`} className="w-full bg-papel">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {campo !== 'titulo' && <SelectItem value={NAO_USAR}>Não usar</SelectItem>}
                {cabecalho.map((nome, indice) => (
                  <SelectItem key={indice} value={String(indice)}>
                    {nome || `Coluna ${indice + 1}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
    </fieldset>
  )
}
