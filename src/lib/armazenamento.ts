/**
 * Pede ao navegador para não apagar o IndexedDB quando faltar espaço em disco.
 * Não impede que o usuário limpe os dados do site; para isso existe o backup.
 */
export async function solicitarArmazenamentoPersistente() {
  if (!navigator.storage?.persist) return false
  if (await navigator.storage.persisted()) return true
  return navigator.storage.persist()
}
