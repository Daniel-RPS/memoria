import { expect, test, type Page } from '@playwright/test'

/**
 * Logo oficial: completa na barra expandida (símbolo 512×512 + nome "MemorIA" em SVG com
 * `currentColor`), só o símbolo na recolhida (botão e Ctrl+B), nos temas claro e escuro, imagens
 * carregadas sem 404, favicon e título da aba. Capturas em e2e/capturas/logo-*.png.
 */

const HOJE = '2026-11-02'
const LARGURA_RECOLHIDA = 64
const LARGURA_EXPANDIDA = 224

function barraLateral(page: Page) {
  return page.locator('aside').first()
}

function larguraDaBarra(page: Page) {
  return barraLateral(page).evaluate((barra) => barra.getBoundingClientRect().width)
}

function seletorDeTema(page: Page) {
  return barraLateral(page).getByRole('radiogroup', { name: 'Tema' })
}

/** O símbolo anunciado ("MemorIA") do tema atual e se carregou em alta resolução (512 px). */
async function logoVisivel(page: Page) {
  const logo = barraLateral(page).getByRole('img', { name: 'MemorIA', exact: true })
  await expect(logo).toHaveCount(1)
  await expect(logo).toBeVisible()
  await expect
    .poll(() => logo.evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBeGreaterThanOrEqual(512)
  return logo
}

async function esperarOpacidadeDoNome(page: Page, opacidade: string) {
  const nome = barraLateral(page).locator('[data-logo-nome]')
  await expect.poll(() => nome.evaluate((svg) => getComputedStyle(svg).opacity)).toBe(opacidade)
}

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date(`${HOJE}T10:00:00-03:00`))
})

test('expandida mostra a logo completa e recolhida (botão e Ctrl+B) mostra o símbolo, nos temas claro e escuro', async ({
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

  for (const [rotulo, sufixo, arquivoEsperado, corEsperada] of [
    ['Claro', 'claro', /simbolo-memoria-claro/, 'rgb(17, 16, 25)'],
    ['Escuro', 'escuro', /simbolo-memoria\.png/, 'rgb(236, 232, 245)'],
  ] as const) {
    await seletorDeTema(page).getByRole('radio', { name: rotulo }).click()
    await expect(page.locator('html')).toHaveAttribute('data-tema', sufixo)
    await expect(await logoVisivel(page)).toHaveAttribute('src', arquivoEsperado)
    await esperarOpacidadeDoNome(page, '1')
    const corDoNome = await page
      .locator('aside [data-logo-nome]')
      .evaluate((svg) => getComputedStyle(svg).color)
    expect(corDoNome).toBe(corEsperada)
    await page.screenshot({
      path: `e2e/capturas/logo-expandida-${sufixo}.png`,
      clip: { x: 0, y: 0, width: 260, height: 120 },
    })

    await page.getByRole('button', { name: 'Recolher menu' }).click()
    await expect.poll(() => larguraDaBarra(page)).toBe(LARGURA_RECOLHIDA)
    await expect(await logoVisivel(page)).toHaveAttribute('src', arquivoEsperado)
    await esperarOpacidadeDoNome(page, '0')
    await page.screenshot({
      path: `e2e/capturas/logo-recolhida-${sufixo}.png`,
      clip: { x: 0, y: 0, width: 120, height: 140 },
    })

    await page.keyboard.press('Control+b')
    await expect.poll(() => larguraDaBarra(page)).toBe(LARGURA_EXPANDIDA)
    await esperarOpacidadeDoNome(page, '1')
  }

  await page.keyboard.press('Control+b')
  await expect.poll(() => larguraDaBarra(page)).toBe(LARGURA_RECOLHIDA)
  await esperarOpacidadeDoNome(page, '0')

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

test('clique na logo abre o Início sem recarregar (expandida e recolhida), botão de recolher não navega, e foco visível nos dois temas', async ({
  page,
}) => {
  // 1. Ir para outra tela (ex.: Notas)
  await page.goto('/notas')
  await expect.poll(() => larguraDaBarra(page)).toBe(LARGURA_EXPANDIDA)

  // Marca no window para conferir que a navegação não recarrega a página.
  await page.evaluate(() => {
    ;(window as unknown as { __spaTeste?: boolean }).__spaTeste = true
  })

  const linkLogo = barraLateral(page).getByRole('link', { name: 'MemorIA — ir para o Início' })
  const linkInicioNav = page
    .getByRole('navigation', { name: 'Telas' })
    .getByRole('link', { name: 'Início' })

  // 2. Clicar na logo com a barra expandida
  await linkLogo.click()
  await expect(page).toHaveURL('/inicio')
  expect(await page.evaluate(() => (window as unknown as { __spaTeste?: boolean }).__spaTeste)).toBe(
    true,
  )
  await expect(linkInicioNav).toHaveAttribute('aria-current', 'page')

  // Clicar novamente estando já no Início não recarrega a página
  await linkLogo.click()
  await expect(page).toHaveURL('/inicio')
  expect(await page.evaluate(() => (window as unknown as { __spaTeste?: boolean }).__spaTeste)).toBe(
    true,
  )

  // 3. Voltar para /notas e recolher a barra
  await page.goto('/notas')
  await page.evaluate(() => {
    ;(window as unknown as { __spaTeste?: boolean }).__spaTeste = true
  })
  const botaoRecolher = page.getByRole('button', { name: 'Recolher menu' })
  await botaoRecolher.click()
  // Conferir que o botão de recolher não navega
  await expect(page).toHaveURL('/notas')
  await expect.poll(() => larguraDaBarra(page)).toBe(LARGURA_RECOLHIDA)

  // 4. Clicar na logo com a barra recolhida (símbolo)
  await linkLogo.click()
  await expect(page).toHaveURL('/inicio')
  expect(await page.evaluate(() => (window as unknown as { __spaTeste?: boolean }).__spaTeste)).toBe(
    true,
  )

  // 5. Captura da sidebar com foco por teclado na logo para conferir foco visível, nos dois temas
  await page.keyboard.press('Control+b')
  await expect.poll(() => larguraDaBarra(page)).toBe(LARGURA_EXPANDIDA)

  for (const [rotulo, sufixo] of [
    ['Claro', 'claro'],
    ['Escuro', 'escuro'],
  ] as const) {
    await seletorDeTema(page).getByRole('radio', { name: rotulo }).click()
    await expect(page.locator('html')).toHaveAttribute('data-tema', sufixo)
    // Foco por teclado: foca o botão ao lado e volta com Shift+Tab para acionar :focus-visible.
    await page.getByRole('button', { name: 'Recolher menu' }).focus()
    await page.keyboard.press('Shift+Tab')
    await expect(linkLogo).toBeFocused()
    await page.screenshot({
      path: `e2e/capturas/logo-foco-${sufixo}.png`,
      clip: { x: 0, y: 0, width: 260, height: 120 },
    })
  }
})
