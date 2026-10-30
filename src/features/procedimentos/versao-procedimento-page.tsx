import { useState } from 'react'
import { toast } from 'sonner'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { restaurarVersao } from '@/db/repositories/procedure-repository'
import { ConteudoProcedimento } from '@/features/procedimentos/components/conteudo-procedimento'
import {
  useProcedimento,
  useVersaoProcedimento,
} from '@/features/procedimentos/hooks/use-procedimentos'

/** Versão antiga, só para leitura, com a opção de restaurá-la. */
export function VersaoProcedimentoPage() {
  const { id = '', versao: textoVersao = '' } = useParams()
  const versao = Number(textoVersao)
  const navigate = useNavigate()
  const { procedimento: atual } = useProcedimento(id)
  const { procedimento: antigo, isCarregando } = useVersaoProcedimento(id, versao)
  const [isConfirmando, setIsConfirmando] = useState(false)

  if (isCarregando || atual === undefined) return null
  if (!antigo || !atual) return <Navigate to={`/procedimentos/${id}`} replace />

  const isAtual = atual.versao === versao

  async function handleRestaurar() {
    const nova = await restaurarVersao(id, versao)
    toast(`Versão ${versao} restaurada como versão ${nova}.`)
    navigate(`/procedimentos/${id}`)
  }

  return (
    <>
      <Link to={`/procedimentos/${id}`} className="text-sm text-grafite hover:text-tinta">
        {atual.titulo}
      </Link>
      <h1 className="mt-1 text-4xl font-extrabold tracking-[-0.02em] [font-stretch:80%]">
        Versão {versao}
      </h1>
      <p className="mt-2 max-w-prose text-grafite">
        {isAtual
          ? 'Esta é a versão atual.'
          : `Como o procedimento estava antes da versão ${versao + 1}. Só leitura.`}
      </p>
      {!isAtual && (
        <Button variant="outline" className="mt-4" onClick={() => setIsConfirmando(true)}>
          Restaurar esta versão
        </Button>
      )}

      <div className="mt-8 rounded-md border border-pauta bg-papel p-4 sm:p-6">
        {antigo.titulo !== atual.titulo && (
          <p className="mb-4 font-semibold">Título nesta versão: {antigo.titulo}</p>
        )}
        <ConteudoProcedimento procedimento={antigo} />
      </div>

      <AlertDialog open={isConfirmando} onOpenChange={setIsConfirmando}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restaurar a versão {versao}?</AlertDialogTitle>
            <AlertDialogDescription>
              O conteúdo dela vira a versão {atual.versao + 1}. A versão atual ({atual.versao}) fica
              guardada no histórico, então nada se perde.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleRestaurar()}>Restaurar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
