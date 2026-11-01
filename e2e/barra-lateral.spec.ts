import { expect, test, type Page } from '@playwright/test'

/**
 * Grupo "Calendário" da barra lateral: abrir e fechar (mouse e teclado), navegar pelas
 * visões (na Semana, pelo menu do ícone), lembrar o estado ao recarregar e as demais telas.
 * Capturas em e2e/capturas/barra-lateral-*.png.
 */

const HOJE = '2026-11-02'

async function capturar(page: Page, nome: string) {
  await page.screenshot({
    path: `e2e/capturas/barra-lateral-${nome}.png`,
    clip: { x: 0, y: 0, width: 420, height: 520 },
  })
}

function navegacao(page: Page) {
  return page.getByRole('navigation', { name: 'Telas' })
}

function cabecalhoDoGrupo(page: Page) {
  return navegacao(page).getByRole('button', { name: /^Calendário/ })
}

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date(`${HOJE}T10:00:00-03:00`))
})

test('mouse: abre, fecha e navega Dia → Semana → Mês → Ano', async ({ page }) => {
  await page.goto(`/dia/${HOJE}`)
  const grupo = cabecalhoDoGrupo(page)
  await expect(grupo).toHaveAttribute('aria-expanded', 'true')
  await expect(navegacao(page).getByRole('link', { name: 'Dia', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  )
  await capturar(page, '1-aberto-dia')

  await grupo.click()
  await expect(grupo).toHaveAttribute('aria-expanded', 'false')
  await expect(grupo).toHaveAccessibleName('Calendário · Dia')
  await expect(navegacao(page).getByRole('link', { name: 'Mês', exact: true })).toBeHidden()
  await expect(page).toHaveURL(`/dia/${HOJE}`)
  await page.waitForTimeout(600)
  await capturar(page, '2-fechado')

  await grupo.click()
  await expect(grupo).toHaveAttribute('aria-expanded', 'true')

  // Na Semana a barra recolhe e o grupo vira um ícone com menu.
  await navegacao(page).getByRole('link', { name: 'Semana', exact: true }).click()
  await expect(page).toHaveURL(`/semana/${HOJE}`)
  const icone = navegacao(page).getByRole('button', { name: 'Calendário: Semana' })
  await icone.click()
  await expect(page.getByRole('menuitem', { name: 'Semana' })).toHaveAttribute(
    'aria-current',
    'page',
  )
  await capturar(page, '3-recolhida-menu')
  await page.getByRole('menuitem', { name: 'Mês' }).click()
  await expect(page).toHaveURL(`/mes/${HOJE}`)

  const ano = navegacao(page).getByRole('link', { name: 'Ano', exact: true })
  await ano.click()
  await page.waitForTimeout(90)
  await capturar(page, '4-deslizando')
  await expect(page).toHaveURL('/ano/2026')
  await expect(ano).toHaveAttribute('aria-current', 'page')
  await page.waitForTimeout(600)
  await capturar(page, '5-ano')
})

test('teclado: Tab chega no grupo, Enter/Espaço alternam, setas andam nas visões', async ({
  page,
}) => {
  await page.goto(`/dia/${HOJE}`)
  const grupo = cabecalhoDoGrupo(page)
  await expect(grupo).toBeVisible()
  // Com o Vite frio a página pode recarregar e perder o foco: espera assentar antes do Tab.
  await page.waitForLoadState('networkidle')

  await page.keyboard.press('Tab')
  await expect(grupo).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(grupo).toHaveAttribute('aria-expanded', 'false')
  // Fechado, Tab pula as visões e vai direto para Procedimentos.
  await page.keyboard.press('Tab')
  await expect(navegacao(page).getByRole('link', { name: 'Procedimentos' })).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await page.keyboard.press('Space')
  await expect(grupo).toHaveAttribute('aria-expanded', 'true')

  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('ArrowDown')
  const mes = navegacao(page).getByRole('link', { name: 'Mês', exact: true })
  await expect(mes).toBeFocused()
  await page.waitForTimeout(500)
  await capturar(page, '6-foco-teclado')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(`/mes/${HOJE}`)
  await expect(mes).toHaveAttribute('aria-current', 'page')
})

test('lembra aberto/fechado ao recarregar', async ({ page }) => {
  await page.goto('/notas')
  const grupo = cabecalhoDoGrupo(page)
  await expect(grupo).toHaveAttribute('aria-expanded', 'true')

  await grupo.click()
  await page.reload()
  await expect(grupo).toHaveAttribute('aria-expanded', 'false')
  await expect(grupo).toHaveAccessibleName('Calendário')

  await grupo.click()
  await page.reload()
  await expect(grupo).toHaveAttribute('aria-expanded', 'true')

  // Numa visão do calendário ele sempre começa aberto.
  await grupo.click()
  await page.goto(`/mes/${HOJE}`)
  await expect(grupo).toHaveAttribute('aria-expanded', 'true')
})

test('as demais telas continuam funcionando', async ({ page }) => {
  await page.goto(`/dia/${HOJE}`)
  const telas = [
    { nome: 'Procedimentos', endereco: '/procedimentos' },
    { nome: 'Notas', endereco: '/notas' },
    { nome: 'Categorias', endereco: '/categorias' },
    { nome: 'Backup', endereco: '/backup' },
  ]
  for (const tela of telas) {
    const link = navegacao(page).getByRole('link', { name: tela.nome, exact: true })
    await link.click()
    await expect(page).toHaveURL(tela.endereco)
    await expect(link).toHaveAttribute('aria-current', 'page')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  }
  // Fora do calendário o grupo não fica destacado nem diz visão nenhuma.
  await cabecalhoDoGrupo(page).click()
  await expect(cabecalhoDoGrupo(page)).toHaveAccessibleName('Calendário')
})

test('com movimento reduzido, abre e fecha sem animação', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(`/dia/${HOJE}`)
  const idPainel = await cabecalhoDoGrupo(page).getAttribute('aria-controls')
  const painel = page.locator(`[id="${idPainel}"]`)
  const propriedade = await painel.evaluate(
    (elemento) => getComputedStyle(elemento).transitionProperty,
  )
  expect(propriedade).toBe('none')
})
