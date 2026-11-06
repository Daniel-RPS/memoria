import { expect, test, type Page } from '@playwright/test'

/**
 * Aba Grupos: quais grupos existem e quantos são, por categoria, com o contador da barra
 * lateral, atualização entre abas, arquivar, abrir o dia e a barra recolhida.
 * Capturas em e2e/capturas/grupos-*.png.
 */

const HOJE = '2026-11-06'
const AMANHA = '2026-11-07'

interface Modulos {
  categorias: {
    criarCategoria: (dados: { nome: string; cor?: string }) => Promise<{ id: string }>
  }
  grupos: {
    criarGrupo: (dados: {
      titulo: string
      data: string
      categoryId?: string
    }) => Promise<{ id: string }>
    criarItem: (cardId: string, titulo: string) => Promise<{ id: string }>
    definirConclusaoItem: (id: string, concluido: boolean) => Promise<void>
  }
}

/** "Casa" (categoria Lar, hoje e amanhã) e "Estudos" (sem categoria, só amanhã). */
async function semear(page: Page) {
  await page.evaluate(
    async ({ hoje, amanha }) => {
      const importar = (caminho: string) => import(/* @vite-ignore */ caminho)
      const m = {
        categorias: await importar('/src/db/repositories/category-repository.ts'),
        grupos: await importar('/src/db/repositories/group-repository.ts'),
      } as Modulos
      const lar = await m.categorias.criarCategoria({ nome: 'Lar', cor: '#2f8a57' })
      const casa = await m.grupos.criarGrupo({ titulo: 'Casa', data: hoje, categoryId: lar.id })
      await m.grupos.criarItem(casa.id, 'Varrer')
      const louca = await m.grupos.criarItem(casa.id, 'Lavar a louça')
      await m.grupos.definirConclusaoItem(louca.id, true)
      await m.grupos.criarGrupo({ titulo: 'Casa', data: amanha, categoryId: lar.id })
      const estudos = await m.grupos.criarGrupo({ titulo: 'Estudos', data: amanha })
      await m.grupos.criarItem(estudos.id, 'Ler capítulo 3')
    },
    { hoje: HOJE, amanha: AMANHA },
  )
}

function navegacao(page: Page) {
  return page.getByRole('navigation', { name: 'Telas' })
}

function linkGrupos(page: Page) {
  return navegacao(page).getByRole('link', { name: 'Grupos', exact: true })
}

function bloco(page: Page, nome: string) {
  return page.getByRole('region', { name: nome, exact: true })
}

function lista(page: Page) {
  return page.getByRole('region', { name: 'Lista de grupos' })
}

async function capturar(page: Page, nome: string) {
  await page.mouse.move(0, 0)
  await page.screenshot({ path: `e2e/capturas/grupos-${nome}.png`, fullPage: true })
}

async function abrirGrupos(page: Page, tema: 'claro' | 'escuro' = 'claro') {
  await page.evaluate((valor) => localStorage.setItem('memoria:tema', valor), tema)
  await semear(page)
  await page.goto('/grupos')
  await expect(page.getByRole('heading', { name: 'Grupos', level: 1 })).toBeVisible()
}

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date(`${HOJE}T10:00:00-03:00`))
  await page.goto(`/dia/${HOJE}`)
})

test('lista por categoria, com o contador da barra e o resumo de cada grupo', async ({ page }) => {
  await abrirGrupos(page)
  await expect(page.getByText('2 grupos', { exact: true })).toBeVisible()
  await expect(linkGrupos(page).locator('[data-contador]')).toHaveText('2')
  await expect(linkGrupos(page)).toHaveAttribute('aria-description', '2 grupos')

  await expect(bloco(page, 'Lar').getByRole('button', { name: /Casa/ })).toHaveText(
    /Casa1 pendente · 1 feito · 2 dias/,
  )
  await expect(bloco(page, 'Sem categoria').getByRole('button', { name: /Estudos/ })).toHaveText(
    /Estudos1 pendente · 1 dia/,
  )
  // "Sem categoria" vem por último.
  const nomes = await lista(page)
    .getByRole('region')
    .evaluateAll((regioes) => regioes.map((regiao) => regiao.getAttribute('aria-label') ?? ''))
  expect(nomes.filter(Boolean).at(-1)).toBe('Sem categoria')

  await page.getByRole('searchbox', { name: 'Buscar grupos' }).fill('lar')
  await expect(bloco(page, 'Sem categoria')).toBeHidden()
  await expect(bloco(page, 'Lar').getByRole('button', { name: /Casa/ })).toBeVisible()
  await page.getByRole('searchbox', { name: 'Buscar grupos' }).fill('')
  await expect(bloco(page, 'Sem categoria')).toBeVisible()
  await page.getByRole('searchbox', { name: 'Buscar grupos' }).blur()
  await capturar(page, 'cheia-claro')

  await page.evaluate(() => localStorage.setItem('memoria:tema', 'escuro'))
  await page.reload()
  await expect(bloco(page, 'Lar')).toBeVisible()
  await capturar(page, 'cheia-escuro')
})

test('criar um grupo em outra janela sobe o contador e a lista sem recarregar', async ({
  page,
  context,
}) => {
  await abrirGrupos(page)
  await expect(linkGrupos(page).locator('[data-contador]')).toHaveText('2')

  const outra = await context.newPage()
  await outra.goto(`/dia/${HOJE}`)
  const grupos = outra.getByRole('region', { name: 'Grupos', exact: true })
  await grupos.getByRole('button', { name: 'Novo grupo' }).click()
  await outra.getByRole('textbox', { name: 'Novo grupo' }).fill('Mercado')
  await outra.getByRole('textbox', { name: 'Novo grupo' }).press('Enter')
  await expect(outra.getByRole('region', { name: 'Grupo Mercado' })).toBeVisible()

  await expect(linkGrupos(page).locator('[data-contador]')).toHaveText('3')
  await expect(page.getByText('3 grupos', { exact: true })).toBeVisible()
  await expect(
    bloco(page, 'Sem categoria').getByRole('button', { name: /Mercado.*nenhum item · 1 dia/ }),
  ).toBeVisible()
})

test('arquivar Casa em todos os dias tira da aba e desce o contador', async ({ page }) => {
  await abrirGrupos(page)
  for (const data of [HOJE, AMANHA]) {
    await page.goto(`/dia/${data}`)
    await page.getByRole('button', { name: 'Mais ações para o grupo Casa' }).click()
    await page.getByRole('menuitem', { name: 'Arquivar' }).click()
    await expect(page.getByRole('region', { name: 'Grupo Casa' })).toBeHidden()
  }
  await expect(linkGrupos(page).locator('[data-contador]')).toHaveText('1')
  await linkGrupos(page).click()
  await expect(page.getByText('1 grupo', { exact: true })).toBeVisible()
  await expect(lista(page).getByRole('button', { name: /Casa/ })).toHaveCount(0)
  await expect(bloco(page, 'Lar')).toBeHidden()
})

test('Abrir no dia abre o dia de destino do grupo', async ({ page }) => {
  await abrirGrupos(page)
  // Casa tem card hoje; Estudos só amanhã (o próximo).
  await lista(page).getByRole('button', { name: /Casa/ }).click()
  await lista(page)
    .getByRole('link', { name: /Abrir no dia/ })
    .click()
  await expect(page).toHaveURL(new RegExp(`/dia/${HOJE}$`))
  await expect(page.getByRole('region', { name: 'Grupo Casa' })).toBeVisible()

  await linkGrupos(page).click()
  await lista(page)
    .getByRole('button', { name: /Estudos/ })
    .click()
  await lista(page)
    .getByRole('link', { name: /Abrir no dia/ })
    .click()
  await expect(page).toHaveURL(new RegExp(`/dia/${AMANHA}$`))
  await expect(page.getByRole('region', { name: 'Grupo Estudos' })).toBeVisible()
})

test('barra recolhida: ícone e dica de Grupos; capturas nos dois temas', async ({ page }) => {
  await abrirGrupos(page)
  await capturar(page, 'barra-aberta-claro')
  for (const tema of ['claro', 'escuro'] as const) {
    await page.evaluate((valor) => localStorage.setItem('memoria:tema', valor), tema)
    await page.reload()
    await expect(bloco(page, 'Lar')).toBeVisible()
    await page.keyboard.press('Control+b')
    await expect(page.getByRole('button', { name: 'Expandir menu' })).toBeVisible()
    await page.waitForTimeout(600)
    await expect(linkGrupos(page)).toHaveAttribute('aria-current', 'page')
    await linkGrupos(page).hover()
    await expect(page.getByRole('tooltip', { name: 'Grupos' })).toBeVisible()
    await page.screenshot({
      path: `e2e/capturas/grupos-barra-recolhida-${tema}.png`,
      clip: { x: 0, y: 0, width: 420, height: 520 },
    })
    await page.keyboard.press('Control+b')
    await expect(page.getByRole('button', { name: 'Recolher menu' })).toBeVisible()
  }
})

test('vazia: ícone apagado, texto de onde criar e sem contador', async ({ page }) => {
  for (const tema of ['claro', 'escuro'] as const) {
    await page.evaluate((valor) => localStorage.setItem('memoria:tema', valor), tema)
    await page.goto('/grupos')
    await expect(page.getByText('Nenhum grupo ainda.', { exact: false })).toBeVisible()
    await expect(page.getByText('0 grupos', { exact: true })).toBeVisible()
    await expect(linkGrupos(page).locator('[data-contador]')).toHaveCount(0)
    await capturar(page, `vazia-${tema}`)
  }
})
