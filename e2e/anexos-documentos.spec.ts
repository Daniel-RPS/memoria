import { expect, test } from '@playwright/test'

/**
 * Anexo de documentos em notas:
 * - abrir uma nota
 * - anexar um PDF pequeno com setInputFiles -> aparece o cartão com nome e tamanho
 * - tentar um .exe -> aviso de formato
 * - tentar arquivo de 20 MB + 1 byte -> aviso de limite
 * - remover o PDF -> some
 */
test('anexo de documentos na nota (validação, exibição e remoção)', async ({ page }) => {
  test.setTimeout(60_000)
  await page.goto('/notas')

  // Cria uma nova nota
  await page.getByRole('button', { name: 'Nova nota' }).click()
  await expect(page.getByPlaceholder('Título')).toBeVisible()
  await page.getByPlaceholder('Título').fill('Nota com documentos')

  const entradaDoc = page.locator('input[aria-label="Escolher documentos da nota"]')

  // 1. Anexa um PDF pequeno
  await entradaDoc.setInputFiles({
    name: 'documento-teste.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4 teste'),
  })

  // Aparece o cartão com o nome e o tamanho
  await expect(page.getByText('documento-teste.pdf')).toBeVisible()
  await expect(page.locator('li', { hasText: 'documento-teste.pdf' }).locator('p.text-xs')).toBeVisible()

  // 2. Tenta um .exe -> aviso de formato
  await entradaDoc.setInputFiles({
    name: 'programa.exe',
    mimeType: 'application/x-msdownload',
    buffer: Buffer.from('MZ...'),
  })
  await expect(page.getByText('Formato não aceito. Use PDF, Word, Excel ou DWG.')).toBeVisible()

  // 3. Tenta arquivo de 20 MB + 1 byte -> aviso de limite
  const bytesAcima = 20 * 1024 * 1024 + 1
  await entradaDoc.setInputFiles({
    name: 'planta-grande.dwg',
    mimeType: 'image/vnd.dwg',
    buffer: Buffer.alloc(bytesAcima),
  })
  await expect(page.getByText('planta-grande.dwg tem 20 MB. O limite é 20 MB.')).toBeVisible()

  // 4. Remover o PDF -> some
  await page.getByRole('button', { name: 'Remover documento-teste.pdf' }).click()
  // Confirmação no diálogo
  await page.getByRole('button', { name: 'Remover' }).click()
  await expect(page.locator('ul[aria-label^="Documentos"]').getByText('documento-teste.pdf')).not.toBeVisible()
})
