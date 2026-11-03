import { toast } from 'sonner'
import { useNavigate } from 'react-router'
import {
  arquivar,
  desarquivar,
  excluirDefinitivamente,
  type DestinoDoDesarquivar,
  restaurarEstado,
} from '@/db/repositories/arquivo-repository'
import { avisarComDesfazer } from '@/hooks/use-mover-tarefas'
import { textoDoAviso, type Alvos, type TipoArquivado } from '@/lib/arquivados'
import { ErroDeValidacao } from '@/lib/erros'

/**
 * Arquivar, desarquivar e excluir com o aviso de sempre ("Desfazer", também no Ctrl+Z). Arquivar
 * oferece "Ver arquivados". A gravação é do `arquivo-repository`.
 */
export function useAcoesDeArquivo() {
  const navigate = useNavigate()

  async function arquivarComAviso(alvos: Alvos, tipos: TipoArquivado[]) {
    const anteriores = await arquivar(alvos)
    avisarComDesfazer(
      textoDoAviso(
        'arquivado',
        tipos.map((tipo) => ({ tipo })),
      ),
      () => restaurarEstado(anteriores),
      { label: 'Ver arquivados', onClick: () => void navigate('/arquivados') },
    )
  }

  /** Devolve `false` (e avisa) quando o grupo não pode voltar para aquele dia. */
  async function desarquivarComAviso(
    alvos: Alvos,
    tipos: TipoArquivado[],
    destino?: DestinoDoDesarquivar,
  ) {
    try {
      const anteriores = await desarquivar(alvos, destino)
      avisarComDesfazer(
        textoDoAviso(
          'desarquivado',
          tipos.map((tipo) => ({ tipo })),
        ),
        () => restaurarEstado(anteriores),
      )
      return true
    } catch (erro) {
      if (!(erro instanceof ErroDeValidacao)) throw erro
      toast.error(erro.message)
      return false
    }
  }

  async function excluirComAviso(alvos: Alvos, quantidade: number) {
    await excluirDefinitivamente(alvos)
    toast(quantidade === 1 ? 'Item excluído' : `${quantidade} itens excluídos`)
  }

  return { arquivarComAviso, desarquivarComAviso, excluirComAviso }
}
