import { expect, test, type Page } from '@playwright/test'

/**
 * Barra lateral: grupo "Calendário" (abrir/fechar com mouse e teclado, navegar pelas visões),
 * recolher/expandir só quando o usuário manda (botão e Ctrl+B, lembrado ao recarregar), menu
 * do Calendário na barra recolhida, sem filtro por categoria. Capturas em
 * e2e/capturas/barra-lateral-*.png (antes/depois de cada cenário).
 */

const HOJE = '2026-11-02'
const LARGURA_EXPANDIDA = 224
const LARGURA_RECOLHIDA = 64
// Espera a mola da largura (400ms) assentar antes de medir ou capturar.
const FIM_DA_TRANSICAO = 600

async function capturar(page: Page, nome: string, largura = 420) {
  await page.screenshot({
    path: `e2e/capturas/barra-lateral-${nome}.png`,
    clip: { x: 0, y: 0, width: largura, height: 520 },
  })
}

function navegacao(page: Page) {
  return page.getByRole('navigation', { name: 'Telas' })
}

function cabecalhoDoGrupo(page: Page) {
  return navegacao(page).getByRole('button', { name: 'Calendário' })
}

function larguraDaBarra(page: Page) {
  return page.locator('aside').evaluate((barra) => barra.getBoundingClientRect().width)
}

async function esperarLargura(page: Page, largura: number) {
  await expect.poll(() => larguraDaBarra(page)).toBe(largura)
}

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date(`${HOJE}T10:00:00-03:00`))
})

test('Dia → Semana → Mês → Ano: a barra continua expandida e o grupo aberto', async ({ page }) => {
  await page.goto(`/dia/${HOJE}`)
  await esperarLargura(page, LARGURA_EXPANDIDA)
  await capturar(page, '1-antes-dia', 900)

  const visoes = [
    { nome: 'Dia', endereco: `/dia/${HOJE}` },
    { nome: 'Semana', endereco: `/semana/${HOJE}` },
    { nome: 'Mês', endereco: `/mes/${HOJE}` },
    { nome: 'Ano', endereco: '/ano/2026' },
  ]
  for (const visao of visoes) {
    const link = navegacao(page).getByRole('link', { name: visao.nome, exact: true })
    await link.click()
    await expect(page).toHaveURL(visao.endereco)
    await expect(link).toHaveAttribute('aria-current', 'page')
    await expect(cabecalhoDoGrupo(page)).toHaveAttribute('aria-expanded', 'true')
    await expect(page.getByRole('button', { name: 'Recolher menu' })).toBeVisible()
    expect(await larguraDaBarra(page)).toBe(LARGURA_EXPANDIDA)
    for (const outra of visoes.filter((item) => item !== visao)) {
      await expect(
        navegacao(page).getByRole('link', { name: outra.nome, exact: true }),
      ).not.toHaveAttribute('aria-current')
    }
    if (visao.nome === 'Semana') await capturar(page, '1-depois-semana-expandida', 900)
  }
  await page.waitForTimeout(FIM_DA_TRANSICAO)
  await capturar(page, '1-depois-ano')
})

test('grupo fechado mostra só "Calendário", destacado na visão do calendário', async ({ page }) => {
  await page.goto(`/mes/${HOJE}`)
  const grupo = cabecalhoDoGrupo(page)
  await expect(grupo).toHaveAttribute('aria-expanded', 'true')
  await capturar(page, '2-antes-aberto')

  await grupo.click()
  await expect(grupo).toHaveAttribute('aria-expanded', 'false')
  await expect(grupo).toHaveText('Calendário')
  await expect(grupo).toHaveAccessibleName('Calendário')
  await expect(navegacao(page).getByRole('link', { name: 'Mês', exact: true })).toBeHidden()
  await expect(page).toHaveURL(`/mes/${HOJE}`)
  await page.waitForTimeout(FIM_DA_TRANSICAO)
  await capturar(page, '2-depois-fechado')
})

test('recolhe e expande pelo botão e por Ctrl+B; lembra ao recarregar', async ({ page }) => {
  await page.goto(`/dia/${HOJE}`)
  await esperarLargura(page, LARGURA_EXPANDIDA)
  await capturar(page, '3-antes-expandida', 900)

  await page.getByRole('button', { name: 'Recolher menu' }).click()
  await page.waitForTimeout(150)
  await capturar(page, '3-durante-recolhendo', 900)
  await esperarLargura(page, LARGURA_RECOLHIDA)
  await capturar(page, '3-depois-recolhida', 900)

  await page.reload()
  await expect(page.getByRole('button', { name: 'Expandir menu' })).toBeVisible()
  expect(await larguraDaBarra(page)).toBe(LARGURA_RECOLHIDA)

  await page.getByRole('button', { name: 'Expandir menu' }).click()
  await esperarLargura(page, LARGURA_EXPANDIDA)

  await page.keyboard.press('Control+b')
  await esperarLargura(page, LARGURA_RECOLHIDA)
  await page.reload()
  await expect(page.getByRole('button', { name: 'Expandir menu' })).toBeVisible()

  await page.keyboard.press('Control+b')
  await esperarLargura(page, LARGURA_EXPANDIDA)
  await page.reload()
  await expect(page.getByRole('button', { name: 'Recolher menu' })).toBeVisible()
  expect(await larguraDaBarra(page)).toBe(LARGURA_EXPANDIDA)
})

test('recolhida: as 4 visões pelo menu do Calendário, com dicas no hover', async ({ page }) => {
  await page.goto(`/dia/${HOJE}`)
  await page.getByRole('button', { name: 'Recolher menu' }).click()
  await esperarLargura(page, LARGURA_RECOLHIDA)

  await navegacao(page).getByRole('link', { name: 'Notas', exact: true }).hover()
  await expect(page.getByRole('tooltip', { name: 'Notas' })).toBeVisible()
  await capturar(page, '4-antes-dica')

  const visoes = [
    { nome: 'Semana', endereco: `/semana/${HOJE}` },
    { nome: 'Mês', endereco: `/mes/${HOJE}` },
    { nome: 'Ano', endereco: '/ano/2026' },
    { nome: 'Dia', endereco: `/dia/${HOJE}` },
  ]
  for (const visao of visoes) {
    await cabecalhoDoGrupo(page).click()
    const item = page.getByRole('menuitem', { name: visao.nome })
    if (visao.nome === 'Mês') await capturar(page, '4-durante-menu')
    await item.click()
    await expect(page).toHaveURL(visao.endereco)
    expect(await larguraDaBarra(page)).toBe(LARGURA_RECOLHIDA)
  }
  await cabecalhoDoGrupo(page).click()
  await expect(page.getByRole('menuitem', { name: 'Dia' })).toHaveAttribute('aria-current', 'page')
  await capturar(page, '4-depois-menu-dia')
})

test('sem filtro por categoria: as visões mostram todas as categorias', async ({ page }) => {
  await page.goto(`/dia/${HOJE}`)
  await page.evaluate(async (data) => {
    const categorias = '/src/db/repositories/category-repository.ts'
    const tarefas = '/src/db/repositories/task-repository.ts'
    const grupos = '/src/db/repositories/group-repository.ts'
    const { criarCategoria } = await import(/* @vite-ignore */ categorias)
    const { criarTarefa } = await import(/* @vite-ignore */ tarefas)
    const { criarGrupo } = await import(/* @vite-ignore */ grupos)
    const casa = await criarCategoria({ nome: 'Casa' })
    const trabalho = await criarCategoria({ nome: 'Trabalho' })
    await criarTarefa({ titulo: 'Podar', data, categoryId: casa.id })
    await criarTarefa({ titulo: 'Relatório', data, categoryId: trabalho.id })
    await criarTarefa({ titulo: 'Ler', data })
    await criarGrupo({ titulo: 'Mercado', data, categoryId: casa.id })
  }, HOJE)

  // Endereço antigo com filtro: agora é ignorado.
  await page.goto(`/dia/${HOJE}?categoria=qualquer`)
  for (const titulo of ['Podar', 'Relatório', 'Ler']) {
    await expect(page.getByText(titulo, { exact: true })).toBeVisible()
  }
  await expect(page.getByRole('region', { name: 'Grupo Mercado' })).toBeVisible()
  await expect(page.getByText('Filtrar por categoria')).toHaveCount(0)
  await capturar(page, '5-depois-dia-sem-filtro', 900)

  await navegacao(page).getByRole('link', { name: 'Semana', exact: true }).click()
  for (const titulo of ['Podar', 'Relatório', 'Ler', 'Mercado']) {
    await expect(page.getByText(titulo, { exact: true }).first()).toBeVisible()
  }
  await expect(page.getByText('Filtrar por categoria')).toHaveCount(0)
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
  await expect(page.getByRole('button', { name: 'Recolher menu' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(navegacao(page).getByRole('link', { name: 'Início' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(grupo).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(grupo).toHaveAttribute('aria-expanded', 'false')
  // Fechado, Tab pula as visões e vai direto para Grupos.
  await page.keyboard.press('Tab')
  await expect(navegacao(page).getByRole('link', { name: 'Grupos', exact: true })).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await page.keyboard.press('Space')
  await expect(grupo).toHaveAttribute('aria-expanded', 'true')

  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('ArrowDown')
  const mes = navegacao(page).getByRole('link', { name: 'Mês', exact: true })
  await expect(mes).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(`/mes/${HOJE}`)
  await expect(mes).toHaveAttribute('aria-current', 'page')
  // Escolher uma visão não fecha o grupo.
  await expect(grupo).toHaveAttribute('aria-expanded', 'true')
})

test('lembra o grupo aberto/fechado ao recarregar', async ({ page }) => {
  await page.goto('/notas')
  const grupo = cabecalhoDoGrupo(page)
  await expect(grupo).toHaveAttribute('aria-expanded', 'true')

  await grupo.click()
  await page.reload()
  await expect(grupo).toHaveAttribute('aria-expanded', 'false')

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
})

test('com movimento reduzido, grupo e barra mudam sem animação', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(`/dia/${HOJE}`)
  const idPainel = await cabecalhoDoGrupo(page).getAttribute('aria-controls')
  const transicaoDoPainel = await page
    .locator(`[id="${idPainel}"]`)
    .evaluate((elemento) => getComputedStyle(elemento).transitionProperty)
  expect(transicaoDoPainel).toBe('none')
  const transicaoDaBarra = await page
    .locator('aside')
    .evaluate((elemento) => getComputedStyle(elemento).transitionProperty)
  expect(transicaoDaBarra).toBe('none')

  await page.getByRole('button', { name: 'Recolher menu' }).click()
  expect(await larguraDaBarra(page)).toBe(LARGURA_RECOLHIDA)
})
