import { LockKeyhole } from 'lucide-react'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import type { CampoVariavel, TipoCampoVariavel } from '@/db/types'
import { textoCredencial } from '@/lib/procedimentos'

interface CamposExecucaoProps {
  campos: CampoVariavel[]
  valores: Record<string, string>
  onMudar: (valores: Record<string, string>) => void
}

const TIPO_DO_INPUT: Record<Exclude<TipoCampoVariavel, 'credencial'>, string> = {
  texto: 'text',
  numero: 'number',
  data: 'date',
}

/** Valores desta execução. Credenciais mostram só onde a senha está: não há campo de senha. */
export function CamposExecucao({ campos, valores, onMudar }: CamposExecucaoProps) {
  if (campos.length === 0) return null

  return (
    <section
      aria-labelledby="titulo-campos-execucao"
      className="mt-6 rounded-md border border-pauta bg-papel p-4 sm:p-6"
    >
      <h2 id="titulo-campos-execucao" className="font-bold">
        Valores desta execução
      </h2>
      <FieldGroup className="mt-4 grid gap-4 sm:grid-cols-2">
        {campos.map((campo) =>
          campo.tipo === 'credencial' ? (
            <div key={campo.id} className="flex flex-col gap-1">
              <span className="text-sm font-medium">{campo.nome}</span>
              <p className="flex items-center gap-1.5 rounded-md bg-muted px-3 py-2 text-[0.9375rem]">
                <LockKeyhole aria-hidden className="size-4 shrink-0" />
                {textoCredencial(campo)}
              </p>
            </div>
          ) : (
            <Field key={campo.id}>
              <FieldLabel htmlFor={`valor-${campo.id}`}>{campo.nome}</FieldLabel>
              <Input
                id={`valor-${campo.id}`}
                type={TIPO_DO_INPUT[campo.tipo]}
                value={valores[campo.id] ?? ''}
                onChange={(evento) => onMudar({ ...valores, [campo.id]: evento.target.value })}
                autoComplete="off"
              />
              <FieldDescription>
                Aparece nos passos onde está {`{{${campo.nome}}}`}.
              </FieldDescription>
            </Field>
          ),
        )}
      </FieldGroup>
    </section>
  )
}
