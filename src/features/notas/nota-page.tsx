import { useEffect, useRef } from 'react'
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router'
import { EditorNota } from '@/components/notas/editor-nota'
import { descartarSeVazia } from '@/db/repositories/note-repository'
import { useNota } from '@/features/notas/hooks/use-notas'

/** Estado da navegação de "Nova nota": a nota acabou de ser criada em branco. */
export interface EstadoNotaNova {
  isNova: true
}

function isNotaNova(estado: unknown): estado is EstadoNotaNova {
  return typeof estado === 'object' && estado !== null && 'isNova' in estado
}

export function NotaPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { state } = useLocation()
  const isNova = isNotaNova(state)
  const { nota, isCarregando } = useNota(id)

  // "Nova nota" fechada sem nada escrito não fica para trás (como "Adicionar nota" na gaveta).
  // Só a recém-criada: notas antigas em branco não são apagadas ao abrir e sair.
  // No StrictMode o efeito monta, desmonta e monta de novo: o cancelamento no início
  // do efeito impede que o descarte agendado no 1º cleanup apague a nota ainda em uso.
  const descarteAgendado = useRef<number | undefined>(undefined)
  useEffect(() => {
    window.clearTimeout(descarteAgendado.current)
    if (!isNova) return
    return () => {
      // Depois do editor gravar o texto pendente (ele grava ao desmontar).
      descarteAgendado.current = window.setTimeout(() => void descartarSeVazia(id), 0)
    }
  }, [id, isNova])

  if (isCarregando) return null
  if (!nota) return <Navigate to="/notas" replace />

  return (
    <EditorNota
      key={nota.id}
      nota={nota}
      variante="pagina"
      inicio={
        <Link to="/notas" className="text-sm text-grafite hover:text-tinta">
          Notas
        </Link>
      }
      onExcluida={() => navigate('/notas')}
    />
  )
}
