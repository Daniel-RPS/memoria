import { expect, test, type Page } from '@playwright/test'

/** Submenu "Categoria ›" do menu ⋯ do grupo: painel "Nova categoria" fixo e lista tolerante ao mouse. */

const HOJE = '2026-11-05'

async function semear(page: Page) {
  await page.evaluate(async (hoje) => {
    const importar = (caminho: string) => import(/* @vite-ignore */ caminho) as Promise<any> // eslint-disable-line
    const categorias = await importar('/src/db/repositories/category-repository.ts')
    const grupos = await importar('/src/db/repositories/group-repository.ts')
    const trabalho = await categorias.criarCategoria({ nome: 'Trabalho' })
    const casa = await grupos.criarGrupo({ titulo: 'Casa', data: hoje, categoryId: trabalho.id })
    await grupos.criarItem(casa.id, 'Lavar louça')
  }, HOJE)
}

async function abrirSubmenu(page: Page) {
  await page.getByRole('button', { name: 'Mais ações para o grupo Casa' }).click()
  await page.getByRole('menuitem', { name: 'Categoria' }).hover()
  await expect(page.getByRole('menuitemradio', { name: 'Sem categoria' })).toBeVisible()
}

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date(`${HOJE}T10:00:00-03:00`))
  await page.goto(`/dia/${HOJE}`)
  await semear(page)
  await page.goto(`/dia/${HOJE}`)
  await expect(page.getByRole('region', { name: 'Tarefas do dia' })).toBeVisible()
})

test('painel "Nova categoria" não fecha com o mouse sobre outros itens; Esc fecha', async ({
  page,
}) => {
  await abrirSubmenu(page)
  await page.getByRole('menuitem', { name: 'Nova categoria' }).click()
  const campo = page.getByRole('textbox', { name: 'Nova categoria', exact: true })
  await campo.fill('Teste')
  await page.getByRole('menuitem', { name: 'Renomear' }).hover()
  await page.waitForTimeout(600)
  await page.getByRole('menuitem', { name: 'Arquivar' }).hover()
  await page.waitForTimeout(600)
  await expect(campo).toBeVisible()
  await expect(campo).toHaveValue('Teste')
  await page.keyboard.press('Escape')
  await expect(campo).toBeHidden()
})

test('lista de categorias: voltar em menos de 300 ms mantém; ficar fora fecha', async ({ page }) => {
  await abrirSubmenu(page)
  const opcao = page.getByRole('menuitemradio', { name: 'Sem categoria' })
  const caixa = (await opcao.boundingBox())!
  await page.getByRole('menuitem', { name: 'Renomear' }).hover()
  await page.waitForTimeout(100)
  await page.mouse.move(caixa.x + caixa.width / 2, caixa.y + caixa.height / 2)
  await page.waitForTimeout(500)
  await expect(opcao).toBeVisible()

  await page.getByRole('menuitem', { name: 'Renomear' }).hover()
  await expect(opcao).toBeHidden()
})
