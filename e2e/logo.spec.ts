import { expect, test, type Page } from '@playwright/test'

/**
 * Logo oficial: completa na barra expandida, só o símbolo na recolhida (botão e Ctrl+B), imagens
 * carregadas sem 404, favicon e título da aba. Capturas em e2e/capturas/logo-*.png.
 */

const HOJE = '2026-11-02'
const LARGURA_RECOLHIDA = 64
const LARGURA_EXPANDIDA = 224

function larguraDaBarra(page: Page) {
  return page.locator('aside').evaluate((barra) => barra.getBoundingClientRect().width)
}

/** A logo anunciada ("MemorIA") e qual arquivo ela mostra. */
async function logoVisivel(page: Page) {
  const logo = page.locator('aside').getByRole('img', { name: 'MemorIA', exact: true })
  await expect(logo).toHaveCount(1)
  await expect(logo).toBeVisible()
  // Carregou de fato (imagem quebrada tem largura natural 0).
  await expect
    .poll(() => logo.evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBeGreaterThan(0)
  return logo
}

async function esperarOpacidade(page: Page, arquivo: string, opacidade: string) {
  // Só o par da logo do tema atual (o do outro tema fica escondido).
  const imagem = page
    .locator('aside [data-logo]')
    .filter({ visible: true })
    .locator(`img[src*="${arquivo}"]`)
  await expect.poll(() => imagem.evaluate((img) => getComputedStyle(img).opacity)).toBe(opacidade)
}

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date(`${HOJE}T10:00:00-03:00`))
})

test('expandida mostra a logo completa; recolhida (botão e Ctrl+B) mostra o símbolo', async ({
  page,
}) => {
  const falhas: string[] = []
  page.on('console', (mensagem) => {
    if (mensagem.type() === 'error') falhas.push(mensagem.text())
  })
  page.on('response', (resposta) => {
    if (resposta.status() >= 400) falhas.push(`${resposta.status()} ${resposta.url()}`)
  })

  await page.goto(`/dia/${HOJE}`)
  await expect.poll(() => larguraDaBarra(page)).toBe(LARGURA_EXPANDIDA)
  await expect(await logoVisivel(page)).toHaveAttribute('src', /logo-memoria/)
  await esperarOpacidade(page, 'simbolo-memoria', '0')
  await page.screenshot({
    path: 'e2e/capturas/logo-expandida.png',
    clip: { x: 0, y: 0, width: 260, height: 120 },
  })

  await page.getByRole('button', { name: 'Recolher menu' }).click()
  await expect.poll(() => larguraDaBarra(page)).toBe(LARGURA_RECOLHIDA)
  await expect(await logoVisivel(page)).toHaveAttribute('src', /simbolo-memoria/)
  await esperarOpacidade(page, 'logo-memoria', '0')
  await page.screenshot({
    path: 'e2e/capturas/logo-recolhida.png',
    clip: { x: 0, y: 0, width: 120, height: 140 },
  })

  await page.keyboard.press('Control+b')
  await expect.poll(() => larguraDaBarra(page)).toBe(LARGURA_EXPANDIDA)
  await expect(await logoVisivel(page)).toHaveAttribute('src', /logo-memoria/)

  await page.keyboard.press('Control+b')
  await expect.poll(() => larguraDaBarra(page)).toBe(LARGURA_RECOLHIDA)
  await expect(await logoVisivel(page)).toHaveAttribute('src', /simbolo-memoria/)

  expect(falhas).toEqual([])
})

test('favicon e título da aba', async ({ page }) => {
  await page.goto(`/dia/${HOJE}`)
  await expect(page).toHaveTitle('MemorIA')

  const icones = await page
    .locator('link[rel="icon"], link[rel="apple-touch-icon"]')
    .evaluateAll((links) => links.map((link) => (link as HTMLLinkElement).href))
  expect(icones).toHaveLength(3)
  for (const endereco of icones) {
    const resposta = await page.request.get(endereco)
    expect(resposta.status(), endereco).toBe(200)
    expect(resposta.headers()['content-type'], endereco).toMatch(/image/)
  }

  // O Playwright não fotografa a moldura do navegador: monta uma aba com o favicon e o título
  // reais, em tema claro e escuro, para conferir contraste e nitidez no tamanho de verdade.
  const titulo = await page.title()
  await page.setContent(`
    <style>
      body { margin: 0; font: 13px system-ui, sans-serif; }
      .aba { display: flex; align-items: center; gap: 8px; width: 220px; padding: 9px 12px; }
      .clara { background: #dee1e6; color: #1f1f1f; }
      .escura { background: #35363a; color: #e8eaed; }
    </style>
    <div class="aba clara"><img src="/favicon-32.png" width="16" height="16" alt="">${titulo}</div>
    <div class="aba escura"><img src="/favicon-32.png" width="16" height="16" alt="">${titulo}</div>
  `)
  await page.waitForFunction(() => [...document.images].every((img) => img.naturalWidth > 0))
  await page.screenshot({
    path: 'e2e/capturas/logo-aba.png',
    clip: { x: 0, y: 0, width: 244, height: 72 },
  })
})
