import { useNavigate } from 'react-router'
import { capturar, desfazerCaptura, type NovaCaptura } from '@/db/repositories/captura-repository'
import { avisarComDesfazer } from '@/hooks/use-mover-tarefas'
import { textoCapturado } from '@/lib/captura'

/**
 * Cria pela captura rápida e avisa "Tarefa criada para 03/11 · Ver no dia · Desfazer"
 * (Ctrl+Z também desfaz enquanto o aviso está na tela).
 */
export function useCaptura() {
  const navigate = useNavigate()

  async function handleCapturar(dados: NovaCaptura) {
    const resultado = await capturar(dados)
    avisarComDesfazer(
      textoCapturado(resultado.tipo, resultado.data),
      () => desfazerCaptura(resultado),
      { label: 'Ver no dia', onClick: () => void navigate(`/dia/${resultado.data}`) },
    )
    return resultado
  }

  return { capturar: handleCapturar }
}
