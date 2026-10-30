import { Navigate } from 'react-router'
import { hoje } from '@/lib/datas'

export function IrParaHoje() {
  return <Navigate to={`/dia/${hoje()}`} replace />
}
