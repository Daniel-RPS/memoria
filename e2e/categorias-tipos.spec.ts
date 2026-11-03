import { expect, test, type Locator, type Page } from '@playwright/test'

/**
 * Categorias separadas em Grupos e Procedimentos (seções, seletores, arrasto por seção, duas
 * abas) e cor personalizada pelo misturador. Capturas em e2e/capturas/categorias-tipos-*.png.
 */

const SEGUNDA = '2026-11-02'
const AZUL_HEX = '#3b82f6'
const RGB_AZUL_HEX = 'rgb(59, 130, 246)'

interface ModuloCategorias {
  criarCategoria: (dados: {
    nome: string
    cor?: string
    tipo?: 'grupo' | 'procedimento'
  }) => Promise<{ id: string }>
}

interface ModuloBanco {
  db: { categories: { toArray: () => Promise<{ nome: string; cor: string; tipo: string }[]> } }
}

async function capturar(page: Page, nome: string) {
  await page.screenshot({ path: `e2e/capturas/categorias-tipos-${nome}.png` })
}

async function semearCategorias(
  page: Page,
  categorias: { nome: string; cor?: string; tipo: 'grupo' | 'procedimento' }[],
) {
  return page.evaluate(async (lista) => {
    const caminho = '/src/db/repositories/category-repository.ts'
    const modulo = (await import(/* @vite-ignore */ caminho)) as ModuloCategorias
    const ids: string[] = []
    for (const categoria of lista) ids.push((await modulo.criarCategoria(categoria)).id)
    return ids
  }, categorias)
}

async function lerCategorias(page: Page) {
  return page.evaluate(async () => {
    const caminho = '/src/db/database.ts'
    const { db } = (await import(/* @vite-ignore */ caminho)) as ModuloBanco
    return db.categories.toArray()
  })
}

function lista(page: Page, secao: 'Grupos' | 'Procedimentos') {
  return page.getByRole('list', { name: `Categorias de ${secao}` })
}

/** Nomes das categorias de uma seção, na ordem da tela. */
function nomesDa(page: Page, secao: 'Grupos' | 'Procedimentos') {
  return lista(page, secao)
    .locator(':scope > li')
    .evaluateAll((itens) =>
      itens.map((item) => item.querySelector('button.font-semibold')?.textContent ?? ''),
    )
}

/** Arrasta pela alça até o centro de `alvo`, em passos (o dnd-kit precisa de movimento). */
async function arrastar(page: Page, alca: Locator, alvo: Locator) {
  const de = await alca.boundingBox()
  const para = await alvo.boundingBox()
  if (!de || !para) throw new Error('Sem posição para arrastar')
  await page.mouse.move(de.x + de.width / 2, de.y + de.height / 2)
  await page.mouse.down()
  await page.mouse.move(de.x + de.width / 2, de.y + de.height / 2 + 8, { steps: 4 })
  await page.mouse.move(para.x + para.width / 2, para.y + para.height / 2 + 6, { steps: 12 })
  await page.mouse.up()
}

/** Cor da faixa do card (o primeiro `span` decorativo). */
function corDaFaixa(card: Locator) {
  return card.evaluate((elemento) => {
    const faixa = elemento.querySelector('span[aria-hidden]')
    return faixa ? getComputedStyle(faixa).backgroundColor : ''
  })
}

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-02T10:00:00-03:00'))
})

test('aba Categorias: uma seção por tipo e criar uma categoria em cada', async ({ page }) => {
  await page.goto('/categorias')
  const grupos = page.getByRole('region', { name: /^Grupos/ })
  const procedimentos = page.getByRole('region', { name: /^Procedimentos/ })
  await expect(grupos.getByRole('heading', { name: 'Grupos 0 categorias' })).toBeVisible()
  await expect(
    procedimentos.getByRole('heading', { name: 'Procedimentos 0 categorias' }),
  ).toBeVisible()

  await page.getByRole('button', { name: 'Nova categoria em Grupos' }).click()
  await page.getByRole('textbox', { name: 'Nova categoria' }).fill('Casa')
  await page.keyboard.press('Enter')
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Nova categoria em Procedimentos' }).click()
  await page.getByRole('textbox', { name: 'Nova categoria' }).fill('Casa')
  await capturar(page, '1-criando')
  await page.keyboard.press('Enter')

  await expect(
    lista(page, 'Grupos').getByRole('button', { name: 'Casa', exact: true }),
  ).toBeVisible()
  await expect(
    lista(page, 'Procedimentos').getByRole('button', { name: 'Casa', exact: true }),
  ).toBeVisible()
  await expect(grupos.getByRole('heading', { name: 'Grupos 1 categoria' })).toBeVisible()
  const banco = await lerCategorias(page)
  expect(banco.map(({ nome, tipo }) => `${tipo}:${nome}`).sort()).toEqual([
    'grupo:Casa',
    'procedimento:Casa',
  ])
  await capturar(page, '1-depois')
})

test('seletores: a captura rápida lista só Grupo e o procedimento só Procedimento', async ({
  page,
}) => {
  await page.goto('/inicio')
  await semearCategorias(page, [
    { nome: 'Casa', tipo: 'grupo' },
    { nome: 'Receitas', tipo: 'procedimento' },
  ])

  await page.getByRole('button', { name: 'Sem categoria' }).click()
  await expect(page.getByRole('menuitemradio', { name: 'Casa' })).toBeVisible()
  await expect(page.getByRole('menuitemradio', { name: 'Receitas' })).toHaveCount(0)
  await capturar(page, '2-captura')
  await page.keyboard.press('Escape')

  await page.goto('/procedimentos/novo')
  await page.getByRole('button', { name: 'Categoria', exact: true }).click()
  await expect(page.getByRole('menuitemradio', { name: 'Receitas' })).toBeVisible()
  await expect(page.getByRole('menuitemradio', { name: 'Casa' })).toHaveCount(0)
  await capturar(page, '2-procedimento')
})

test('categoria criada pelo seletor do procedimento aparece em Procedimentos, sem recarregar', async ({
  page,
}) => {
  await page.goto('/procedimentos/novo')
  await page.getByRole('button', { name: 'Categoria', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Nova categoria' }).click()
  await page.getByRole('textbox', { name: 'Nova categoria' }).fill('Github')
  await page.getByRole('textbox', { name: 'Nova categoria' }).press('Enter')
  await expect(page.getByRole('button', { name: 'Categoria', exact: true })).toHaveText('Github')

  await page
    .getByRole('navigation', { name: 'Telas' })
    .getByRole('link', { name: 'Categorias' })
    .click()
  await expect(
    lista(page, 'Procedimentos').getByRole('button', { name: 'Github', exact: true }),
  ).toBeVisible()
  await expect(lista(page, 'Grupos')).toHaveCount(0)
  await capturar(page, '3-categorias')
})

test('cor personalizada pelo misturador e pelo hex: cards no Dia e na Semana e recentes', async ({
  page,
}) => {
  await page.goto(`/dia/${SEGUNDA}`)
  await page.evaluate(async (data) => {
    const caminhoCategorias = '/src/db/repositories/category-repository.ts'
    const caminhoGrupos = '/src/db/repositories/group-repository.ts'
    const categorias = (await import(/* @vite-ignore */ caminhoCategorias)) as ModuloCategorias
    const grupos = (await import(/* @vite-ignore */ caminhoGrupos)) as {
      criarGrupo: (dados: { titulo: string; data: string; categoryId?: string }) => Promise<{
        id: string
      }>
      criarItem: (cardId: string, titulo: string) => Promise<unknown>
    }
    const casa = await categorias.criarCategoria({ nome: 'Casa', cor: '#c8402f', tipo: 'grupo' })
    const card = await grupos.criarGrupo({ titulo: 'Mercado', data, categoryId: casa.id })
    await grupos.criarItem(card.id, 'Pão')
  }, SEGUNDA)

  // Misturador: arrastar o ponto na área e aplicar.
  await page.goto('/categorias')
  await page.getByRole('button', { name: /^Cor de Casa/ }).click()
  await page.getByRole('radio', { name: 'Cor personalizada' }).click()
  const area = page.getByRole('slider', { name: 'Saturação e brilho' })
  const caixa = await area.boundingBox()
  if (!caixa) throw new Error('Sem área')
  await page.mouse.move(caixa.x + caixa.width * 0.5, caixa.y + caixa.height * 0.5)
  await page.mouse.down()
  await page.mouse.move(caixa.x + caixa.width * 0.85, caixa.y + caixa.height * 0.2, { steps: 6 })
  await page.mouse.up()
  const hex = page.getByRole('textbox', { name: 'Código hexadecimal da cor' })
  const corArrastada = (await hex.inputValue()).toLowerCase()
  expect(corArrastada).not.toBe('#c8402f')
  await capturar(page, '4-misturador')
  await page.getByRole('button', { name: 'Aplicar' }).click()
  await expect.poll(async () => (await lerCategorias(page))[0].cor).toBe(corArrastada)

  // Campo hex, colando sem "#".
  await page.getByRole('radio', { name: /^Cor personalizada/ }).click()
  await hex.fill(AZUL_HEX.slice(1).toUpperCase())
  await hex.press('Enter')
  await expect.poll(async () => (await lerCategorias(page))[0].cor).toBe(AZUL_HEX)
  await expect(
    page.getByRole('radio', { name: `Cor personalizada ${AZUL_HEX.toUpperCase()}` }),
  ).toBeChecked()
  const recentes = page.getByRole('group', { name: 'Cores personalizadas recentes' })
  // Recentes vêm das categorias: a cor arrastada foi trocada pela azul, então só a azul fica.
  await expect(recentes.getByRole('button')).toHaveCount(1)
  await expect(
    recentes.getByRole('button', { name: `Usar ${AZUL_HEX.toUpperCase()}` }),
  ).toBeVisible()
  await capturar(page, '4-recentes')
  await page.keyboard.press('Escape')

  await page.goto(`/dia/${SEGUNDA}`)
  await expect
    .poll(() => corDaFaixa(page.getByRole('region', { name: 'Grupo Mercado' })))
    .toBe(RGB_AZUL_HEX)
  await capturar(page, '4-dia')
  await page.goto(`/semana/${SEGUNDA}`)
  const cardNaSemana = page
    .getByRole('region', { name: 'segunda-feira, 2 de novembro' })
    .getByRole('listitem')
    .filter({ has: page.getByRole('button', { name: /^(Expandir|Recolher) Mercado$/ }) })
  await expect.poll(() => corDaFaixa(cardNaSemana)).toBe(RGB_AZUL_HEX)
  await capturar(page, '4-semana')
})

test('arrastar reordena dentro da seção e não passa para a outra', async ({ page }) => {
  await page.goto('/categorias')
  await semearCategorias(page, [
    { nome: 'Casa', tipo: 'grupo' },
    { nome: 'Trabalho', tipo: 'grupo' },
    { nome: 'Receitas', tipo: 'procedimento' },
    { nome: 'Github', tipo: 'procedimento' },
  ])
  await expect.poll(() => nomesDa(page, 'Grupos')).toEqual(['Casa', 'Trabalho'])

  await arrastar(
    page,
    page.getByRole('button', { name: 'Mover Casa', exact: true }),
    lista(page, 'Grupos').getByRole('button', { name: 'Trabalho', exact: true }),
  )
  await expect.poll(() => nomesDa(page, 'Grupos')).toEqual(['Trabalho', 'Casa'])
  await expect.poll(() => nomesDa(page, 'Procedimentos')).toEqual(['Receitas', 'Github'])

  // Soltar sobre a outra seção não move nada.
  await arrastar(
    page,
    page.getByRole('button', { name: 'Mover Receitas', exact: true }),
    lista(page, 'Grupos').getByRole('button', { name: 'Trabalho', exact: true }),
  )
  await capturar(page, '5-depois')
  await expect.poll(() => nomesDa(page, 'Grupos')).toEqual(['Trabalho', 'Casa'])
  await expect.poll(() => nomesDa(page, 'Procedimentos')).toEqual(['Receitas', 'Github'])
  const banco = await lerCategorias(page)
  expect(banco.find((categoria) => categoria.nome === 'Receitas')?.tipo).toBe('procedimento')
})

test('duas abas: a categoria criada numa aparece na outra', async ({ page, context }) => {
  await page.goto('/categorias')
  const outra = await context.newPage()
  await outra.goto('/categorias')
  await expect(outra.getByRole('heading', { name: 'Grupos 0 categorias' })).toBeVisible()

  await page.getByRole('button', { name: 'Nova categoria em Grupos' }).click()
  await page.getByRole('textbox', { name: 'Nova categoria' }).fill('Saúde')
  await page.keyboard.press('Enter')

  await expect(
    outra
      .getByRole('list', { name: 'Categorias de Grupos' })
      .getByRole('button', { name: 'Saúde', exact: true }),
  ).toBeVisible()
  await expect(outra.getByRole('heading', { name: 'Grupos 1 categoria' })).toBeVisible()
  await outra.screenshot({ path: 'e2e/capturas/categorias-tipos-6-outra-aba.png' })
})
