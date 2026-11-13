/** Faz o navegador baixar `conteudo` (string ou Blob) como um arquivo com o nome dado. */
export function baixarArquivo(nome: string, conteudo: string | Blob, tipo = 'application/json') {
  const blob = typeof conteudo === 'string' ? new Blob([conteudo], { type: tipo }) : conteudo
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = nome
  link.click()
  // Dá tempo de o download começar antes de liberar a memória.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
