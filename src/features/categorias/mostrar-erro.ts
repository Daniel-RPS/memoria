import { toast } from 'sonner'
import { ErroDeValidacao } from '@/lib/erros'

/** Aviso de erro ao renomear (ex.: nome repetido). */
export function mostrarErroAoSalvar(erro: unknown) {
  toast.error(erro instanceof ErroDeValidacao ? erro.message : 'Não foi possível salvar.')
}
