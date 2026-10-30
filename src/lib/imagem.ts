/** Lado maior máximo de uma foto guardada; fotos de celular costumam ter 4000 px ou mais. */
export const LADO_MAXIMO_FOTO = 2048
const QUALIDADE_JPEG = 0.85

/**
 * Reduz a foto para caber em `ladoMaximo`, para não encher o armazenamento e o backup.
 * Devolve a original se já for pequena ou se o navegador não suportar a conversão.
 */
export async function reduzirImagem(arquivo: Blob, ladoMaximo = LADO_MAXIMO_FOTO): Promise<Blob> {
  if (typeof createImageBitmap !== 'function') return arquivo
  try {
    const imagem = await createImageBitmap(arquivo)
    const escala = ladoMaximo / Math.max(imagem.width, imagem.height)
    if (escala >= 1) {
      imagem.close()
      return arquivo
    }
    const tela = document.createElement('canvas')
    tela.width = Math.round(imagem.width * escala)
    tela.height = Math.round(imagem.height * escala)
    tela.getContext('2d')?.drawImage(imagem, 0, 0, tela.width, tela.height)
    imagem.close()
    const reduzida = await new Promise<Blob | null>((resolver) =>
      tela.toBlob(resolver, 'image/jpeg', QUALIDADE_JPEG),
    )
    return reduzida ?? arquivo
  } catch {
    return arquivo
  }
}
