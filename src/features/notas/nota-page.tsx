import { Link, Navigate, useNavigate, useParams } from 'react-router'
import { EditorNota } from '@/components/notas/editor-nota'
import { useNota } from '@/features/notas/hooks/use-notas'

export function NotaPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { nota, isCarregando } = useNota(id)

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
