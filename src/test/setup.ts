import { Blob as BlobDoNode, File as FileDoNode } from 'node:buffer'
import 'fake-indexeddb/auto'
import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterEach } from 'vitest'
import { instalarMatchMedia, limparMidia } from '@/test/midia'

// findBy/waitFor esperam 1 s por padrão: com a suíte em paralelo (ou a máquina ocupada), telas
// inteiras com IndexedDB passam disso e o teste falha sem defeito nenhum. Vale para todos.
configure({ asyncUtilTimeout: 5000 })

// Sem `globals: true` no Vitest, a limpeza automática do Testing Library não é registrada.
afterEach(cleanup)

// O jsdom não implementa captura de ponteiro nem rolagem, que o Radix (Select) usa.
if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = () => {}
  Element.prototype.releasePointerCapture = () => {}
  Element.prototype.hasPointerCapture = () => false
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {}
}
window.scrollTo = () => {}

// O Blob do jsdom vira objeto vazio ao passar pelo fake-indexeddb (o IndexedDB real guarda Blob).
// O Blob nativo do Node sobrevive à cópia, então os testes de anexos usam ele.
globalThis.Blob = BlobDoNode as unknown as typeof Blob
globalThis.File = FileDoNode as unknown as typeof File

// URLs de blob (miniaturas, player de áudio): o jsdom não tem e a do Node só aceita o Blob do
// Node, então os testes usam uma URL fixa.
URL.createObjectURL = () => 'blob:teste'
URL.revokeObjectURL = () => {}

// O jsdom não tem matchMedia (tema "Sistema", movimento reduzido): ver src/test/midia.ts.
instalarMatchMedia()
afterEach(limparMidia)
