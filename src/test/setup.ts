import { Blob as BlobDoNode } from 'node:buffer'
import 'fake-indexeddb/auto'
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

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

// O Blob do jsdom vira objeto vazio ao passar pelo fake-indexeddb (o IndexedDB real guarda Blob).
// O Blob nativo do Node sobrevive à cópia, então os testes de anexos usam ele.
globalThis.Blob = BlobDoNode as unknown as typeof Blob
