/** Faz o navegador baixar `conteudo` como um arquivo com o nome dado. */
export function baixarArquivo(nome: string, conteudo: string, tipo = 'application/json') {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }))
  const link = document.createElement('a')
  link.href = url
  link.download = nome
  link.click()
  // Dá tempo de o download começar antes de liberar a memória.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
