import { FundoDoApp } from '@/app/fundo-do-app'
import { useAparencia } from '@/app/use-aparencia'
import { useAplicarTema } from '@/app/use-aplicar-tema'
import { Toaster } from '@/components/ui/sonner'

/*
 * As únicas partes da moldura que assinam a aparência. Ficam em componentes próprios para que a
 * troca de tema re-renderize só elas, e não o `LayoutApp` com a barra lateral e a tela aberta.
 */

export function AplicadorDoTema() {
  useAplicarTema()
  return null
}

export function FundoDaAparencia() {
  const { fundo } = useAparencia()
  return <FundoDoApp fundo={fundo} />
}

/** Avisos (Sonner). `dir` fixo: sem ele o Sonner lê `getComputedStyle` a cada render. */
export function AvisosDoApp() {
  const { tema } = useAparencia()
  return <Toaster theme={tema === 'escuro' ? 'dark' : 'light'} dir="ltr" position="bottom-center" />
}
