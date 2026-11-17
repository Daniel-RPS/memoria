import {
  arquivarGrupo,
  arquivarItem,
  criarGrupo,
  criarItem,
  definirCategoriaDoGrupo,
  definirConclusaoItem,
  excluirGrupo,
  excluirItem,
  renomearGrupo,
  renomearItem,
  reordenarItem,
} from '@/db/repositories/group-repository'
import {
  passarItemParaGrupoComDesfazer,
  tirarDoGrupoComDesfazer,
} from '@/db/repositories/lote-repository'
import { avisarConversao } from '@/features/dia/hooks/use-movimento-em-lote'
import { avisarComDesfazer } from '@/hooks/use-mover-tarefas'

/** Item passa direto para outro grupo do dia; avisa com Desfazer (devolve grupo e posição). */
async function passarItemParaCard(itemId: string, cardId: string, idsEmOrdem?: string[]) {
  const resultado = await passarItemParaGrupoComDesfazer(itemId, cardId, idsEmOrdem)
  if (resultado) avisarComDesfazer(resultado.texto, resultado.desfazer)
}

/** Item vira tarefa solta; avisa (com Desfazer) se ela ficou sem a categoria do grupo. */
async function tirarDoGrupo(itemId: string, idsEmOrdemNoDia?: string[]) {
  avisarConversao(await tirarDoGrupoComDesfazer(itemId, idsEmOrdemNoDia))
}

/** Ações sobre cards de grupo e itens usadas pela visão do dia; a escrita fica no repositório. */
export function useAcoesGrupo() {
  return {
    criarGrupo,
    criarItem,
    renomearGrupo,
    definirCategoriaDoGrupo,
    arquivarGrupo,
    excluirGrupo,
    renomearItem,
    definirConclusaoItem,
    reordenarItem,
    arquivarItem,
    excluirItem,
    tirarDoGrupo,
    passarItemParaCard,
  }
}
