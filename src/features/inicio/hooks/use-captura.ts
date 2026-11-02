import { useNavigate } from 'react-router'
import {
  capturar,
  desfazerCaptura,
  type NovaCaptura,
  type ResultadoCaptura,
} from '@/db/repositories/captura-repository'
import { avisarComDesfazer } from '@/hooks/use-mover-tarefas'
import { textoGrupoCriado, textoItensAdicionados, textoTarefaCriada } from '@/lib/captura'

function mensagemDoAviso(resultado: ResultadoCaptura, nomeDoGrupo: string) {
  if (resultado.tipo === 'tarefa') return textoTarefaCriada(resultado.data)
  const quantidade = resultado.idsItens.length
  return resultado.tipo === 'grupo'
    ? textoGrupoCriado(nomeDoGrupo, quantidade, resultado.data)
    : textoItensAdicionados(quantidade, nomeDoGrupo, resultado.data)
}

/**
 * Cria pela captura rápida e avisa "Tarefa criada para 03/11 · Ver no dia · Desfazer",
 * "Grupo Casa criado com 3 itens · 02/11 · …" ou "1 item adicionado a Casa · 01/11 · …"
 * (Ctrl+Z também desfaz enquanto o aviso está na tela).
 */
export function useCaptura() {
  const navigate = useNavigate()

  /** `nomeDoGrupo`: o grupo escolhido em "Em grupo…", para o aviso (no grupo novo, o título). */
  async function handleCapturar(dados: NovaCaptura, nomeDoGrupo = '') {
    const resultado = await capturar(dados)
    const nome = dados.tipo === 'grupo' ? dados.titulo.trim() : nomeDoGrupo
    avisarComDesfazer(mensagemDoAviso(resultado, nome), () => desfazerCaptura(resultado), {
      label: 'Ver no dia',
      onClick: () => void navigate(`/dia/${resultado.data}`),
    })
    return resultado
  }

  return { capturar: handleCapturar }
}
