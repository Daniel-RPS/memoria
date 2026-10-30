import { LockKeyhole } from 'lucide-react'
import type { CampoVariavel } from '@/db/types'
import { partesDoTexto } from '@/lib/procedimentos'

interface TextoComCamposProps {
  texto: string
  campos: CampoVariavel[]
  valores?: Record<string, string>
}

/** Texto de um passo com os `{{campos}}` destacados: valor, campo a preencher ou credencial. */
export function TextoComCampos({ texto, campos, valores = {} }: TextoComCamposProps) {
  return (
    <>
      {partesDoTexto(texto, campos, valores).map((parte, indice) => {
        switch (parte.tipo) {
          case 'texto':
            return <span key={indice}>{parte.texto}</span>
          case 'valor':
            return (
              <mark
                key={indice}
                title={parte.campo}
                className="rounded-sm bg-accent px-0.5 font-semibold text-tinta"
              >
                {parte.texto}
              </mark>
            )
          case 'faltando':
            return (
              <span
                key={indice}
                className="rounded-sm border border-dashed border-grafite px-1 text-grafite"
              >
                {parte.campo}
              </span>
            )
          case 'credencial':
            return (
              <span
                key={indice}
                className="inline-flex items-center gap-1 rounded-sm bg-muted px-1"
              >
                <LockKeyhole aria-hidden className="size-3.5" />
                {parte.texto}
              </span>
            )
          case 'desconhecido':
            return (
              <span key={indice} className="text-destructive" title="Esse campo não existe">
                {parte.texto}
              </span>
            )
        }
      })}
    </>
  )
}
