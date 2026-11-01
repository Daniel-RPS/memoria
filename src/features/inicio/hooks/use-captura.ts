import { useNavigate } from 'react-router'
import { capturar, desfazerCaptura, type NovaCaptura } from '@/db/repositories/captura-repository'
import { avisarComDesfazer } from '@/hooks/use-mover-tarefas'
import { textoCapturado, textoItensAdicionados } from '@/lib/captura'

/**
 * Cria pela captura rápida e avisa "Tarefa criada para 03/11 · Ver no dia · Desfazer" ou
 * "1 item adicionado a Casa · 01/11 · …" (Ctrl+Z também desfaz enquanto o aviso está na tela).
 */
export function useCaptura() {
  const navigate = useNavigate()

  /** `nomeDoGrupo`: o grupo escolhido em "Em grupo…", para o aviso. */
  async function handleCapturar(dados: NovaCaptura, nomeDoGrupo = '') {
    const resultado = await capturar(dados)
    const mensagem =
      resultado.tipo === 'em-grupo'
        ? textoItensAdicionados(resultado.idsItens.length, nomeDoGrupo, resultado.data)
        : textoCapturado(resultado.tipo, resultado.data)
    avisarComDesfazer(mensagem, () => desfazerCaptura(resultado), {
      label: 'Ver no dia',
      onClick: () => void navigate(`/dia/${resultado.data}`),
    })
    return resultado
  }

  return { capturar: handleCapturar }
}
