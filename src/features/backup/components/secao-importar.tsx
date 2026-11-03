import { BotaoImportar } from '@/components/importar/botao-importar'

/** Trazer conteúdo de fora em partes, sem substituir nada (diferente de restaurar). */
export function SecaoImportar() {
  return (
    <section
      aria-labelledby="titulo-importar"
      className="mt-8 rounded-md border border-pauta bg-papel p-4 sm:p-6"
    >
      <h2 id="titulo-importar" className="text-xl font-bold">
        Importar conteúdo
      </h2>
      <p className="mt-2 max-w-prose text-[0.9375rem] text-grafite">
        Traga tarefas, grupos, procedimentos e notas de um texto, de uma planilha CSV, do Google
        Keep ou de parte de um backup. O que você já tem continua aqui; dá para desfazer logo
        depois.
      </p>
      <div className="mt-4">
        <BotaoImportar />
      </div>
    </section>
  )
}
