import { useId, useState } from 'react'
import { Plus } from 'lucide-react'
import { ListaOrdenavel } from '@/components/lista-ordenavel'
import { FormularioNovaCategoria } from '@/components/seletor-categoria/formulario-nova-categoria'
import { Button } from '@/components/ui/button'
import type { TipoCategoria } from '@/db/types'
import { useAcoesCategoria } from '@/hooks/use-acoes-categoria'
import { useCategorias } from '@/hooks/use-categorias'
import { NOMES_DO_TIPO, type UsoDaCategoria } from '@/lib/categorias'
import { proximaCor } from '@/lib/cores'
import { ItemCategoria } from '@/features/categorias/components/item-categoria'

/** Para que serve cada tipo, logo abaixo do título da seção. */
const ONDE_VALE: Record<TipoCategoria, string> = {
  grupo: 'Grupos e tarefas do Início e do calendário.',
  procedimento: 'Só na aba Procedimentos.',
}

const EXEMPLO: Record<TipoCategoria, string> = {
  grupo: 'Casa ou Trabalho',
  procedimento: 'Receitas ou Github',
}

interface SecaoCategoriasProps {
  tipo: TipoCategoria
  usoDe: (categoryId: string) => UsoDaCategoria
}

/**
 * Uma seção da aba Categorias: título com contagem, "+ Nova categoria" (já nasce do tipo) e
 * a lista do tipo. Cada seção tem a própria lista de arrasto: reordenar não passa para a outra.
 */
export function SecaoCategorias({ tipo, usoDe }: SecaoCategoriasProps) {
  // Lista memorizada por tipo: um array novo a cada render desfaria a ordem otimista do arrasto.
  const { categorias, isCarregando } = useCategorias(tipo)
  const { criarCategoria, criarDeCategoriaDeProcedimento, reordenarCategoria } = useAcoesCategoria()
  const [isCriando, setIsCriando] = useState(false)
  const idTitulo = useId()
  const { plural } = NOMES_DO_TIPO[tipo]
  const quantidade = categorias.length

  return (
    <section aria-labelledby={idTitulo} className="flex min-w-0 flex-col">
      <header className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1 border-b border-tinta pb-1.5">
        <div className="min-w-0">
          <h2 id={idTitulo} className="text-xl font-bold tracking-[-0.01em] [font-stretch:85%]">
            {plural}{' '}
            <span className="text-base font-medium text-grafite tabular-nums [font-stretch:100%]">
              {quantidade} {quantidade === 1 ? 'categoria' : 'categorias'}
            </span>
          </h2>
          <p className="text-sm text-grafite">{ONDE_VALE[tipo]}</p>
        </div>
        {!isCriando && (
          <Button
            variant="ghost"
            size="sm"
            aria-label={`Nova categoria em ${plural}`}
            onClick={() => setIsCriando(true)}
            className="shrink-0 text-violeta-profundo hover:text-violeta-profundo"
          >
            <Plus /> Nova categoria
          </Button>
        )}
      </header>

      {isCriando && (
        <div className="mt-3 rounded-md border border-pauta bg-papel p-3">
          <FormularioNovaCategoria
            autoFocus
            rotulo="Nova categoria"
            rotuloBotao="Criar categoria"
            corInicial={proximaCor(categorias)}
            onCriar={({ nome, cor }) => criarCategoria({ nome, cor, tipo })}
            onUsarDeProcedimentos={tipo === 'grupo' ? criarDeCategoriaDeProcedimento : undefined}
            onCancelar={() => setIsCriando(false)}
          />
        </div>
      )}

      <div className="mt-3 rounded-md border border-pauta bg-papel">
        {!isCarregando && quantidade === 0 && (
          <p className="px-4 py-3 text-sm text-grafite">
            Nenhuma categoria aqui ainda. Crie a primeira, por exemplo {EXEMPLO[tipo]}.
          </p>
        )}
        <ListaOrdenavel
          itens={categorias}
          rotulo={`Categorias de ${plural}`}
          onReordenar={reordenarCategoria}
          renderItem={(categoria) => (
            <ItemCategoria key={categoria.id} categoria={categoria} uso={usoDe(categoria.id)} />
          )}
        />
      </div>
    </section>
  )
}
