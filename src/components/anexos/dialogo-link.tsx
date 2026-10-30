import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { esquemaLink, type LinkInput } from '@/lib/anexos'

interface DialogoLinkProps {
  isAberto: boolean
  onMudarAberto: (isAberto: boolean) => void
  onSalvar: (link: LinkInput) => Promise<unknown>
}

/** Formulário para guardar um link (endereço e, se quiser, um nome). */
export function DialogoLink({ isAberto, onMudarAberto, onSalvar }: DialogoLinkProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LinkInput>({
    resolver: zodResolver(esquemaLink),
    defaultValues: { url: '', nome: '' },
  })

  async function handleSalvar(link: LinkInput) {
    await onSalvar(link)
    reset()
    onMudarAberto(false)
  }

  return (
    <Dialog
      open={isAberto}
      onOpenChange={(isAbrindo) => {
        if (!isAbrindo) reset()
        onMudarAberto(isAbrindo)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar link</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleSalvar)} noValidate>
          <FieldGroup>
            <Field data-invalid={errors.url ? true : undefined}>
              <FieldLabel htmlFor="link-url">Endereço</FieldLabel>
              <Input
                id="link-url"
                type="url"
                inputMode="url"
                placeholder="https://"
                autoComplete="off"
                aria-invalid={errors.url ? true : undefined}
                {...register('url')}
              />
              <FieldError errors={[errors.url]} />
            </Field>
            <Field data-invalid={errors.nome ? true : undefined}>
              <FieldLabel htmlFor="link-nome">Nome (opcional)</FieldLabel>
              <Input
                id="link-nome"
                placeholder="Ex.: Manual do roteador"
                aria-invalid={errors.nome ? true : undefined}
                {...register('nome')}
              />
              <FieldError errors={[errors.nome]} />
            </Field>
          </FieldGroup>
          <DialogFooter className="mt-6">
            <Button type="submit" disabled={isSubmitting}>
              Adicionar link
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
