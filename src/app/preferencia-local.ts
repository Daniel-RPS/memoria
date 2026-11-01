/*
 * Preferências da tela guardadas no navegador (localStorage). O armazenamento pode faltar ou
 * lançar erro (janela privada, dados bloqueados): aí o app só não lembra a escolha.
 */

export function lerPreferencia(chave: string): string | null {
  try {
    return localStorage.getItem(chave)
  } catch {
    return null
  }
}

export function gravarPreferencia(chave: string, valor: string) {
  try {
    localStorage.setItem(chave, valor)
  } catch {
    // Sem armazenamento: só não lembra.
  }
}
